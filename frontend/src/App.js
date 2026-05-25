import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:8080/api';
const DETECT_TEXT_URL = `${API_BASE}/detect/text`;
const ML_FILE_URL = 'http://localhost:8000/detect/file';

/** POST {"text":"..."} to Spring Boot — explicit JSON string body */
async function postDetectText(textValue) {
  const trimmedText = (textValue ?? '').trim();

  if (!trimmedText) {
    throw new Error('No text to analyze. Paste your LLM response in the text area.');
  }

  const payload = { text: trimmedText };
  const jsonBody = JSON.stringify(payload);

  console.log('[API Request] POST', DETECT_TEXT_URL);
  console.log('[API Request] text state:', textValue);
  console.log('[API Request] trimmed length:', trimmedText.length);
  console.log('[API Request] payload object:', payload);
  console.log('[API Request] JSON body:', jsonBody);

  return axios.post(DETECT_TEXT_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 300000,
  });
}

const TRUSTWORTHY_VERDICTS = ['TRUSTWORTHY', 'MOSTLY ACCURATE'];
const HALLUCINATED_VERDICTS = ['PARTIALLY HALLUCINATED', 'HEAVILY HALLUCINATED'];

function getOverallVerdictClass(verdict) {
  if (!verdict) return 'verdict-neutral';
  if (TRUSTWORTHY_VERDICTS.includes(verdict)) return 'verdict-trustworthy';
  if (HALLUCINATED_VERDICTS.includes(verdict)) return 'verdict-hallucinated';
  return 'verdict-neutral';
}

function getClaimVerdictClass(verdict) {
  if (verdict === 'ACCURATE') return 'claim-accurate';
  if (verdict === 'HALLUCINATED') return 'claim-hallucinated';
  return 'claim-unverifiable';
}

function getDangerClass(level) {
  const map = {
    LOW: 'danger-low',
    MEDIUM: 'danger-medium',
    HIGH: 'danger-high',
    CRITICAL: 'danger-critical',
  };
  return map[level] || 'danger-low';
}

function App() {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get('http://localhost:8080/api/health', { timeout: 5000 });
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }
    };
    checkHealth();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) setError(null);
  };

  const clearFile = () => {
    setFile(null);
    const input = document.getElementById('file-upload');
    if (input) input.value = '';
  };

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    const hasText = Boolean(text.trim());
    const hasFile = Boolean(file);

    if (!hasText && !hasFile) {
      setError('Please paste an LLM response or upload a PDF/image file.');
      return;
    }

    setLoading(true);

    try {
      let response;

      // Prefer pasted text over a stale file selection
      if (hasText) {
        response = await postDetectText(text);
      } else if (hasFile) {
        const formData = new FormData();
        formData.append('file', file);
        console.log('[API Request] POST', ML_FILE_URL, '(multipart file upload)');
        response = await axios.post(ML_FILE_URL, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
        });
      }

      if (response.data?.success === false) {
        setError(response.data.error || 'Analysis failed. Please try again.');
        return;
      }

      setResult(response.data.result);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        (err.code === 'ECONNABORTED'
          ? 'Request timed out. Analysis can take a few minutes.'
          : null) ||
        (err.request
          ? 'Cannot reach the API. Ensure Spring Boot is running on port 8080 and the Python ML service on port 8000.'
          : err.message);

      setError(message);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const overall = result?.overall_score;
  const claims = result?.claims_analysis || [];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="header-text">
            <h1>Hallucination Detector</h1>
            <p className="header-subtitle">
              Verify medical LLM responses claim by claim
            </p>
            <span className="powered-tag">
              Powered by RAG + Agentic AI + Live Web Search
            </span>
          </div>
        </div>
        {apiOnline === false && (
          <div className="api-banner" role="alert">
            API offline — start Spring Boot (8080) and Python ML service (8000)
          </div>
        )}
        {apiOnline === true && (
          <div className="api-banner api-online">System online</div>
        )}
      </header>

      <main className="app-main">
        <section className="input-panel">
          <h2>Input</h2>
          <label htmlFor="llm-text" className="field-label">
            Paste LLM medical response
          </label>
          <textarea
            id="llm-text"
            className="text-input"
            placeholder="Paste the medical text generated by an LLM here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            disabled={loading}
          />

          <div className="file-row">
            <label htmlFor="file-upload" className="file-label">
              Upload PDF or image
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && (
              <span className="file-name">
                {file.name}
                <button
                  type="button"
                  className="clear-file-btn"
                  onClick={clearFile}
                  disabled={loading}
                >
                  Remove
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || (!text.trim() && !file)}
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </section>

        {loading && (
          <section className="loading-panel" aria-live="polite">
            <div className="spinner" />
            <p>Analyzing claims against medical knowledge base…</p>
            <p className="loading-hint">This may take 1–3 minutes</p>
          </section>
        )}

        {error && (
          <section className="error-panel" role="alert">
            <strong>Error</strong>
            <p>{error}</p>
          </section>
        )}

        {result && !loading && (
          <section className="results-panel">
            <h2>Analysis Results</h2>

            <div className="summary-cards">
              <div
                className={`summary-card overall-verdict ${getOverallVerdictClass(
                  overall?.overall_verdict
                )}`}
              >
                <span className="summary-label">Overall Verdict</span>
                <span className="summary-value">{overall?.overall_verdict}</span>
              </div>

              <div className="summary-card">
                <span className="summary-label">Hallucination Rate</span>
                <span className="summary-value">
                  {overall?.hallucination_percentage ?? 0}%
                </span>
              </div>

              <div className="summary-card">
                <span className="summary-label">Highest Danger</span>
                <span
                  className={`danger-badge ${getDangerClass(
                    overall?.highest_danger_level
                  )}`}
                >
                  {overall?.highest_danger_level}
                </span>
              </div>

              <div className="summary-card stats-card">
                <span className="stat">
                  <strong>{overall?.accurate_count ?? 0}</strong> Accurate
                </span>
                <span className="stat">
                  <strong>{overall?.hallucinated_count ?? 0}</strong> Hallucinated
                </span>
                <span className="stat">
                  <strong>{overall?.unverifiable_count ?? 0}</strong> Unverifiable
                </span>
              </div>
            </div>

            <h3 className="claims-heading">
              Claim-by-Claim Analysis ({claims.length})
            </h3>

            <div className="claims-grid">
              {claims.map((claim, index) => (
                <article key={index} className="claim-card">
                  <div className="claim-header">
                    <span
                      className={`claim-verdict-badge ${getClaimVerdictClass(
                        claim.verdict
                      )}`}
                    >
                      {claim.verdict}
                    </span>
                    <span className="confidence">
                      {claim.confidence}% confidence
                    </span>
                    <span
                      className={`danger-badge ${getDangerClass(
                        claim.danger_level
                      )}`}
                    >
                      {claim.danger_level}
                    </span>
                  </div>

                  <p className="claim-text">{claim.claim}</p>

                  <div className="claim-detail">
                    <strong>Reason:</strong> {claim.reason}
                  </div>

                  {claim.verdict === 'HALLUCINATED' && claim.correct_information && (
                    <div className="claim-correction">
                      <strong>Correct information:</strong>{' '}
                      {claim.correct_information}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Hallucination Detector © 2025 · Built with RAG, Agentic AI &amp; MedQuAD
        </p>
      </footer>
    </div>
  );
}

export default App;
