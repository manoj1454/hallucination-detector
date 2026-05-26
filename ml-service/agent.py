import os
import json
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv
from rag_pipeline import format_retrieval_context, search_medical_knowledge

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

MAX_CLAIM_EXTRACTION_LENGTH = 3000
DEFAULT_NO_CLAIMS_MESSAGE = (
    "No clear medical claims could be extracted from this text. "
    "Try a shorter passage or content with specific medical facts."
)


def extract_claims(llm_response: str) -> list[str]:
    """
    AGENT STEP 1:
    Break LLM response into individual checkable medical claims.
    """
    text = llm_response
    if len(text) > MAX_CLAIM_EXTRACTION_LENGTH:
        text = text[:MAX_CLAIM_EXTRACTION_LENGTH]

    prompt = f"""
    You are a medical fact-checker. 
    Break down the following medical text into individual factual claims.
    Each claim should be one specific checkable medical statement.
    
    TEXT: {text}
    
    Respond ONLY with a JSON array of claims like this:
    ["claim 1", "claim 2", "claim 3"]
    
    Do not include opinions or vague statements.
    Only include specific checkable medical facts.
    """

    response = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    content = response.choices[0].message.content or ""
    start = content.find('[')
    end = content.rfind(']') + 1

    if start == -1 or end <= start:
        return []

    try:
        claims = json.loads(content[start:end])
    except (json.JSONDecodeError, ValueError):
        return []

    if not isinstance(claims, list):
        return []

    return [c.strip() for c in claims if isinstance(c, str) and c.strip()]


def is_context_relevant(claim: str, context: str) -> bool:
    """
    AGENT DECISION:
    Ask LLM if RAG context is relevant to the claim.
    """
    prompt = f"""
    Is the following context relevant to verifying this medical claim?
    
    CLAIM: {claim}
    CONTEXT: {context}
    
    Answer with ONLY "YES" or "NO".
    YES = context contains information that helps verify or refute the claim.
    NO = context is about different topics and cannot help verify the claim.
    """

    response = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    answer = response.choices[0].message.content.strip().upper()
    return "YES" in answer


def search_web_for_claim(claim: str) -> tuple[str, str]:
    """
    AGENT FALLBACK:
    Search live web using Tavily for real medical sources.
    Returns (context, source_description)
    """
    try:
        print(f"  → Searching web for: {claim[:60]}...")

        # Search specifically on trusted medical websites
        results = tavily.search(
            query=f"medical facts: {claim}",
            search_depth="basic",
            max_results=3,
            include_domains=[
                "who.int",
                "nhs.uk", 
                "cdc.gov",
                "nih.gov",
                "mayoclinic.org",
                "medlineplus.gov",
                "fda.gov",
                "pubmed.ncbi.nlm.nih.gov"
            ]
        )

        if not results.get('results'):
            # Fallback to general search if trusted sites have nothing
            results = tavily.search(
                query=f"medical facts: {claim}",
                search_depth="basic",
                max_results=3
            )

        # Extract content and sources
        context_parts = []
        sources = []

        for r in results.get('results', []):
            if r.get('content'):
                context_parts.append(r['content'])
            if r.get('url'):
                sources.append(r['url'])

        context = "\n\n".join(context_parts)
        source_desc = "live web search (" + ", ".join(sources[:2]) + ")"

        return context, source_desc

    except Exception as e:
        print(f"  → Web search failed: {e}, using LLM knowledge")
        # Final fallback to LLM knowledge
        prompt = f"""
        Provide factual medical information about: {claim}
        Include specific dosages, guidelines, and safety information.
        Cite NHS, WHO, or FDA guidelines where applicable.
        """
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        return response.choices[0].message.content.strip(), "LLM medical knowledge"


def verify_claim(claim: str) -> dict:
    """
    AGENT STEP 2:
    Verify a single claim using:
    1. RAG (ChromaDB MedQuAD)
    2. Live web search (Tavily) if RAG not relevant
    3. LLM knowledge if web search fails
    """
    # Try RAG first
    rag_context = format_retrieval_context(claim, n_results=3)
    rag_is_relevant = is_context_relevant(claim, rag_context)

    if rag_is_relevant:
        context = rag_context
        source_used = "MedQuAD medical knowledge base"
        print(f"  → Using RAG for: {claim[:50]}")
    else:
        # Fallback to live web search
        context, source_used = search_web_for_claim(claim)
        print(f"  → Using web search for: {claim[:50]}")

    prompt = f"""
    You are a medical fact-checker with access to verified medical sources.
    
    CLAIM TO VERIFY: {claim}
    
    MEDICAL KNOWLEDGE FROM {source_used.upper()}:
    {context}
    
    Using your medical knowledge AND the provided sources, verify this claim.
    Prioritize the provided sources, but also use your general medical 
    knowledge to catch obvious errors.
    
    Respond ONLY in this exact JSON format:
    {{
        "claim": "{claim}",
        "verdict": "ACCURATE" or "HALLUCINATED" or "UNVERIFIABLE",
        "confidence": a number from 0 to 100,
        "reason": "one sentence explanation citing specific medical facts",
        "danger_level": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
        "correct_information": "what the correct medical information is",
        "source": "{source_used}"
    }}
    
    Danger level guide:
    - LOW: wrong but harmless
    - MEDIUM: misleading but unlikely to cause immediate harm
    - HIGH: could cause harm if acted upon
    - CRITICAL: life threatening if acted upon
    
    Only mark UNVERIFIABLE if truly cannot confirm or deny.
    """

    response = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    content = response.choices[0].message.content
    start = content.find('{')
    end = content.rfind('}') + 1

    try:
        verdict = json.loads(content[start:end])
    except (json.JSONDecodeError, ValueError):
        verdict = {
            "claim": claim,
            "verdict": "UNVERIFIABLE",
            "confidence": 0,
            "reason": "Could not parse verification response",
            "danger_level": "LOW",
            "correct_information": "Please consult a medical professional",
            "source": source_used
        }

    return verdict


def calculate_overall_score(verdicts: list[dict]) -> dict:
    """
    AGENT STEP 3:
    Calculate overall hallucination score.
    """
    total_claims = len(verdicts)

    if total_claims == 0:
        return {
            "total_claims": 0,
            "accurate_count": 0,
            "hallucinated_count": 0,
            "unverifiable_count": 0,
            "hallucination_percentage": 0,
            "overall_verdict": "NO CLAIMS FOUND",
            "highest_danger_level": "LOW"
        }

    hallucinated = [v for v in verdicts if v['verdict'] == 'HALLUCINATED']
    accurate = [v for v in verdicts if v['verdict'] == 'ACCURATE']
    unverifiable = [v for v in verdicts if v['verdict'] == 'UNVERIFIABLE']

    hallucination_percentage = (len(hallucinated) / total_claims) * 100

    danger_levels = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
    max_danger = 'LOW'
    for verdict in hallucinated:
        if danger_levels.get(verdict.get('danger_level', 'LOW'), 1) > danger_levels[max_danger]:
            max_danger = verdict['danger_level']

    if hallucination_percentage == 0:
        overall = "TRUSTWORTHY"
    elif hallucination_percentage < 30:
        overall = "MOSTLY ACCURATE"
    elif hallucination_percentage < 60:
        overall = "PARTIALLY HALLUCINATED"
    else:
        overall = "HEAVILY HALLUCINATED"

    return {
        "total_claims": total_claims,
        "accurate_count": len(accurate),
        "hallucinated_count": len(hallucinated),
        "unverifiable_count": len(unverifiable),
        "hallucination_percentage": round(hallucination_percentage, 1),
        "overall_verdict": overall,
        "highest_danger_level": max_danger
    }


def run_hallucination_agent(llm_response: str) -> dict:
    """
    MAIN AGENT FUNCTION:
    Full agentic pipeline:
    1. Extract claims
    2. For each claim: RAG → Web Search → LLM fallback
    3. Calculate overall score
    """
    print("Agent starting analysis...")

    print("Step 1: Extracting claims...")
    claims = extract_claims(llm_response)
    print(f"Found {len(claims)} claims to verify")

    if not claims:
        return {
            "original_response": llm_response,
            "claims_analysis": [],
            "overall_score": calculate_overall_score([]),
            "message": DEFAULT_NO_CLAIMS_MESSAGE,
        }

    print("Step 2: Verifying claims (RAG → Web Search → LLM)...")
    verdicts = []
    for i, claim in enumerate(claims):
        print(f"Verifying claim {i+1}/{len(claims)}: {claim[:50]}...")
        verdict = verify_claim(claim)
        verdicts.append(verdict)

    print("Step 3: Calculating overall score...")
    overall_score = calculate_overall_score(verdicts)

    return {
        "original_response": llm_response,
        "claims_analysis": verdicts,
        "overall_score": overall_score
    }