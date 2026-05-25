"""
RAG pipeline: medical knowledge base (indexing + retrieval).

Loads MedQuAD into ChromaDB on startup and retrieves relevant
documents for claim verification in the agent.
"""

import chromadb
from datasets import load_dataset

MEDICAL_DB_PATH = "./medical_db"
COLLECTION_NAME = "medical_knowledge"
DATASET_ID = "keivalya/MedQuad-MedicalQnADataset"
MAX_DOCUMENTS = 2000
BATCH_SIZE = 100

_chroma_client = chromadb.PersistentClient(path=MEDICAL_DB_PATH)
_collection = _chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)


def load_medical_dataset() -> None:
    """
    Index MedQuAD into ChromaDB (first run only).
    Data persists under ./medical_db for later startups.
    """
    if _collection.count() > 0:
        print(f"Medical knowledge base already loaded: {_collection.count()} documents")
        return

    print("Loading medical dataset for first time, please wait...")
    dataset = load_dataset(DATASET_ID, split="train")
    dataset = dataset.select(range(MAX_DOCUMENTS))

    documents = []
    ids = []
    metadatas = []

    for i, item in enumerate(dataset):
        text = f"Question: {item['Question']} Answer: {item['Answer']}"
        documents.append(text)
        ids.append(f"med_{i}")
        metadatas.append({"source": "MedQuAD", "index": i})

    for i in range(0, len(documents), BATCH_SIZE):
        end = i + BATCH_SIZE
        _collection.add(
            documents=documents[i:end],
            ids=ids[i:end],
            metadatas=metadatas[i:end],
        )
        print(f"Loaded {min(end, len(documents))}/{len(documents)} documents")

    print("Medical knowledge base ready!")


def search_medical_knowledge(query: str, n_results: int = 5) -> list[str]:
    """Retrieve the most relevant medical documents for a query."""
    results = _collection.query(
        query_texts=[query],
        n_results=n_results,
    )
    return results["documents"][0]


def format_retrieval_context(query: str, n_results: int = 3) -> str:
    """Retrieve documents and format them as a single context block for the LLM."""
    return "\n\n".join(search_medical_knowledge(query, n_results=n_results))


def get_collection_size() -> int:
    """Number of documents currently indexed in the knowledge base."""
    return _collection.count()
