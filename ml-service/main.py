import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from extractor import extract_text
from rag_pipeline import load_medical_dataset, get_collection_size
from agent import run_hallucination_agent

# Initialize FastAPI app
app = FastAPI(
    title="Hallucination Detector API",
    description="Detects hallucinations in LLM responses using RAG and Agentic AI",
    version="1.0.0"
)

# CORS middleware - allows React frontend to talk to this API
# Without this the browser blocks requests from different ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Change True to False
    allow_methods=["*"],
    allow_headers=["*"],
)

# This runs once when the server starts
# Loads the medical dataset into ChromaDB
@app.on_event("startup")
async def startup_event():
    print("Server starting up...")
    print("Loading medical knowledge base...")
    load_medical_dataset()
    print(f"Knowledge base ready with {get_collection_size()} documents")
    print("Server ready!")


# ---- REQUEST MODELS ----
# Pydantic models define exactly what data your API expects
# FastAPI validates incoming data against these automatically

class TextRequest(BaseModel):
    text: str  # The LLM response as plain text


# ---- API ENDPOINTS ----

@app.get("/")
def root():
    """Health check - tells you if server is running"""
    return {
        "status": "running",
        "message": "Hallucination Detector API is live",
        "knowledge_base_size": get_collection_size()
    }


@app.post("/detect/text")
async def detect_from_text(request: TextRequest):
    """
    Accepts plain text LLM response
    Returns full hallucination analysis
    """
    try:
        # Run the full agent pipeline
        result = run_hallucination_agent(request.text)
        return {
            "success": True,
            "input_type": "text",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/detect/file")
async def detect_from_file(file: UploadFile = File(...)):
    """
    Accepts PDF or image file
    Extracts text first then runs hallucination analysis
    """
    try:
        # Save uploaded file temporarily
        temp_path = f"./temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract text from file
        extracted_text = extract_text(file_path=temp_path)

        # Clean up temp file
        os.remove(temp_path)

        # Run hallucination detection on extracted text
        result = run_hallucination_agent(extracted_text)

        return {
            "success": True,
            "input_type": file.content_type,
            "extracted_text": extracted_text[:500] + "...",  # Preview first 500 chars
            "result": result
        }
    except Exception as e:
        # Clean up temp file if error occurred
        if os.path.exists(f"./temp_{file.filename}"):
            os.remove(f"./temp_{file.filename}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/knowledge-base/status")
def knowledge_base_status():
    """
    Returns info about your medical knowledge base
    Useful for debugging
    """
    return {
        "total_documents": get_collection_size(),
        "status": "ready" if get_collection_size() > 0 else "empty"
    }