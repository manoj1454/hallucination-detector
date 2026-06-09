# 🔍 Hallucination Detector

> An AI-powered system that detects hallucinations in medical LLM responses using RAG and Agentic AI with claim-level verification and danger scoring.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://hallucination-detector-three.vercel.app)
[![ML Service](https://img.shields.io/badge/ML%20Service-HuggingFace-yellow?style=for-the-badge&logo=huggingface)](https://manoj1454-hallucination-detector-ml.hf.space)
[![API Gateway](https://img.shields.io/badge/API%20Gateway-Render-blue?style=for-the-badge&logo=render)](https://hallucination-detector-backend.onrender.com)

---

## 🧠 What Is This?

Large Language Models like ChatGPT sometimes generate responses that **sound convincing but are factually wrong** — this is called hallucination. In medical domains, this can be dangerous.

**Hallucination Detector** takes any LLM-generated medical response and:
1. Breaks it into individual checkable claims
2. Verifies each claim against trusted medical sources
3. Assigns a danger level to hallucinated claims
4. Returns a detailed verdict with correct information

---

## 🏗️ Architecture

```
React Frontend (Vercel)
        ↓
Spring Boot API Gateway (Render)
        ↓
Python FastAPI ML Service (Hugging Face Spaces)
        ↓
ChromaDB + Tavily Search + Groq LLM
```

---

## ✨ Features

- **Claim-level Analysis** — Every medical statement verified independently
- **Real-time Web Search** — Tavily searches NHS, WHO, FDA when RAG isn't relevant
- **Danger Scoring** — Four-tier risk classification (LOW / MEDIUM / HIGH / CRITICAL)
- **Multi-format Input** — Supports text paste, PDF upload, and image upload
- **RAG Knowledge Base** — 2000+ NIH MedQuAD medical Q&A documents in ChromaDB
- **Agentic Pipeline** — Multi-step autonomous verification with intelligent fallback
- **Microservices Architecture** — Three independent services deployed across platforms

---

## 🤖 How The Agent Works

```
Input (Text / PDF / Image)
        ↓
Text Extraction (PyMuPDF / Groq Vision)
        ↓
Claim Extraction (Groq LLM)
        ↓
For each claim:
  ┌─────────────────────────────┐
  │ Search ChromaDB (RAG)       │
  │ Is context relevant?        │
  │ YES → Verify with RAG       │
  │ NO  → Tavily Web Search     │
  │       Verify with web data  │
  └─────────────────────────────┘
        ↓
Assign Verdict + Danger Level
        ↓
Calculate Overall Score
        ↓
Return Results Dashboard
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vanilla CSS |
| API Gateway | Spring Boot 3.5, Java 21 |
| ML Service | Python 3.11, FastAPI |
| LLM | Groq API (llama-3.3-70b-versatile) |
| Vector DB | ChromaDB |
| Web Search | Tavily API |
| Knowledge Base | MedQuAD (NIH) |
| Deployment | Vercel, Render, Hugging Face Spaces |

---

## 📁 Project Structure

```
hallucination-detector/
│
├── frontend/                    ← React (Vercel)
│   └── src/
│       ├── App.js
│       └── App.css
│
├── backend/                     ← Spring Boot (Render)
│   └── detector/
│       ├── src/
│       │   └── main/java/com/hallucination/detector/
│       │       ├── controller/
│       │       ├── service/
│       │       ├── dto/
│       │       └── exception/
│       └── pom.xml
│
└── ml-service/                  ← Python FastAPI (HF Spaces)
    ├── main.py
    ├── agent.py
    ├── rag_pipeline.py
    ├── extractor.py
    ├── requirements.txt
    └── Dockerfile
```

---

## 🚀 Running Locally

### Prerequisites
- Python 3.11+
- Java 21+
- Node.js 18+
- Groq API key (free at console.groq.com)
- Tavily API key (free at tavily.com)

### 1. Python ML Service
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create .env file
echo GROQ_API_KEY=your_key > .env
echo GROQ_MODEL=llama-3.3-70b-versatile >> .env
echo TAVILY_API_KEY=your_key >> .env

uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 2. Spring Boot Gateway
```bash
cd backend/detector
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### 3. React Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [hallucination-detector-three.vercel.app](https://hallucination-detector-three.vercel.app) |
| API Gateway | Render | [hallucination-detector-backend.onrender.com](https://hallucination-detector-backend.onrender.com) |
| ML Service | Hugging Face | [manoj1454-hallucination-detector-ml.hf.space](https://manoj1454-hallucination-detector-ml.hf.space) |

---

## 🔑 Environment Variables

### ML Service (.env)
```
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
TAVILY_API_KEY=your_tavily_api_key
```

### Spring Boot (application.properties)
```
ml.service.base-url=https://manoj1454-hallucination-detector-ml.hf.space
```

---

## 🎯 What Makes This Different From ChatGPT?

| Feature | ChatGPT | Hallucination Detector |
|---|---|---|
| Claim-level analysis | ❌ | ✅ |
| Danger scoring | ❌ | ✅ |
| Real-time verification | ❌ | ✅ |
| Model agnostic | ❌ | ✅ |
| Source citation | ❌ | ✅ |
| Works on any LLM output | ❌ | ✅ |

---

## 🐛 Known Limitations

- Free tier services may sleep after inactivity (30-60 second wake time)
- Groq API has 100,000 token/day limit on free tier
- Medical knowledge base focused on disease Q&A (drug-specific claims use web search)
- Occasional false negatives on ambiguous medical claims

---

## 📚 Knowledge Sources

- **MedQuAD** — Medical Question Answer Dataset from NIH (National Institutes of Health)
- **Tavily Search** — Real-time web search across NHS, WHO, CDC, FDA, Mayo Clinic

---

## 🏫 About

This project was developed as a mini project by students of the
**Department of Computer Science and Engineering**
**Neil Gogte Institute of Technology, Hyderabad**

---

## 📄 License

MIT License — feel free to use and modify.
