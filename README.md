# LLM Hallucination Detection System

Medical-focused backend that detects hallucinations in LLM responses using RAG (MedQuAD + ChromaDB) and an agentic Groq pipeline.

## Project structure

```
MINI project/
├── requirements.txt          # Python dependencies (install from project root)
├── venv/                     # Virtual environment (create locally, not committed)
├── README.md
├── docs/                     # SRS, abstract (optional — move PDFs here if you like)
├── ml-service/               # FastAPI backend — run the server from this folder
│   ├── .env                  # GROQ_API_KEY (create locally, not committed)
│   ├── main.py               # API entry point
│   ├── agent.py              # Claim extraction + verification pipeline
│   ├── rag_pipeline.py       # ChromaDB + MedQuAD indexing and retrieval
│   ├── extractor.py          # PDF / image / text extraction
│   └── medical_db/           # Persisted vector DB (generated on first run)
└── frontend/                 # (not built yet) React UI
```

## Prerequisites

- Python 3.10+
- A [Groq](https://console.groq.com/) API key

## Setup

1. **Clone or open the project**, then from the project root:

   ```powershell
   cd "B:\MINI project"
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. **Create `ml-service/.env`:**

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **First run** loads the MedQuAD dataset into `ml-service/medical_db/` (about 2000 documents). This happens once on startup.

## Run the API

Always start the server **from `ml-service`** so paths to `.env` and `medical_db` resolve correctly:

```powershell
cd "B:\MINI project"
.\venv\Scripts\Activate.ps1
cd ml-service
uvicorn main:app --reload
```

- Health check: http://127.0.0.1:8000/
- Interactive docs: http://127.0.0.1:8000/docs

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check + knowledge base size |
| `POST` | `/detect/text` | Analyze plain-text LLM response (`{"text": "..."}`) |
| `POST` | `/detect/file` | Upload PDF or image; text is extracted then analyzed |
| `GET` | `/knowledge-base/status` | ChromaDB document count |

## Example: detect from text

```powershell
curl -X POST "http://127.0.0.1:8000/detect/text" `
  -H "Content-Type: application/json" `
  -d '{"text": "Aspirin is commonly used to reduce fever and pain."}'
```

## How it works

1. **Input** — Plain text, PDF (PyMuPDF), or image (Groq vision).
2. **Agent** — Breaks the response into medical claims, verifies each against MedQuAD via ChromaDB retrieval, then scores overall trust.
3. **Output** — Per-claim verdicts (`ACCURATE` / `HALLUCINATED` / `UNVERIFIABLE`), danger levels, and an overall score.

## Files not to commit

Add these to `.gitignore` if you use Git:

- `venv/`
- `ml-service/.env`
- `ml-service/medical_db/`
- `ml-service/temp_*`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GROQ_API_KEY` missing | Create `ml-service/.env` with your key |
| Knowledge base empty | Delete `medical_db/` and restart (reloads dataset) |
| Wrong working directory | Run `uvicorn` from `ml-service`, not the project root |
| Module not found | Activate `venv` and `pip install -r requirements.txt` from project root |

## Related documents

- `SRS_Hallucination_Detection.pdf` — Software requirements specification
- `ABSTRACT1.pdf` — Project abstract
