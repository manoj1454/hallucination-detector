import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const SPRING_API_BASE = 'https://hallucination-detector-backend.onrender.com/api';
const ML_API_BASE = 'https://manoj1454-hallucination-detector-ml.hf.space';
const HEALTH_URL = `${SPRING_API_BASE}/health`;
const DETECT_TEXT_URL = `${SPRING_API_BASE}/detect/text`;
const ML_FILE_URL = `${ML_API_BASE}/detect/file`;
const GITHUB_URL = 'https://github.com';

const TRUSTWORTHY_VERDICTS = ['TRUSTWORTHY', 'MOSTLY ACCURATE'];
const HALLUCINATED_VERDICTS = ['PARTIALLY HALLUCINATED', 'HEAVILY HALLUCINATED'];

const STATS = [
  { value: 2000, suffix: '+', label: 'Medical Documents Indexed' },
  { value: 3, suffix: '-Stage', label: 'Agentic Verification Pipeline' },
  { value: 4, suffix: ' Levels', label: 'Danger Classification' },
];

const STEPS = [
  {
    title: 'Paste or Upload',
    desc: 'Paste your LLM medical response or upload a PDF or image file.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'AI Verification',
    desc: 'Our agent breaks the text into claims and verifies each against RAG and live search.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: 'Detailed Verdict',
    desc: 'Receive claim-by-claim verdicts, danger levels, and corrections with sources.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

const FEATURES = [
  { title: 'Claim-level Analysis', desc: 'Every medical statement is extracted and verified independently.' },
  { title: 'Real-time Web Search', desc: 'Tavily augments the knowledge base with up-to-date medical facts.' },
  { title: 'Danger Level Scoring', desc: 'Four-tier risk classification from LOW to CRITICAL.' },
  { title: 'PDF & Image Support', desc: 'Upload documents and images for automatic text extraction.' },
  { title: 'RAG Knowledge Base', desc: 'MedQuAD and curated sources indexed in ChromaDB.' },
  { title: 'Spring Boot Gateway', desc: 'Secure API gateway between React and the Python ML service.' },
];

/** POST {"text":"..."} to Spring Boot */
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

function AppLogo({ className = '' }) {
  return (
    <svg
      className={`app-logo ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" />
      <polyline points="8.5,12 10.5,14 15.5,9.5" />
    </svg>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-stagger');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function StatCard({ value, suffix, label }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const runCountUp = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      const duration = 1400;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(eased * value));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDisplay(0);
          runCountUp();
        } else {
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          setDisplay(0);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return (
    <div ref={ref} className="stat-card reveal">
      <div className="stat-card-value">
        {display}
        {suffix}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function App() {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [apiOnline, setApiOnline] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useScrollReveal();

  const scrollTo = useCallback((id) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 5000;

    const checkHealth = async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;

        try {
          await axios.get(HEALTH_URL, {
            timeout: 10000,
            validateStatus: () => true,
          });
          if (!cancelled) setApiOnline(true);
          return;
        } catch (err) {
          if (err.response) {
            if (!cancelled) setApiOnline(true);
            return;
          }
          if (attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS);
          }
        }
      }

      if (!cancelled) setApiOnline(false);
    };

    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setHeroVisible(true));
    return () => cancelAnimationFrame(t);
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
          ? 'Cannot reach the API. Please wait a moment and try again. The service may be waking up.'
          : err.message);

      setError(message);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const overall = result?.overall_score;
  const claims = result?.claims_analysis || [];

  const handleNavClick = (e, id) => {
    e.preventDefault();
    scrollTo(id);
  };

  return (
    <div className="app">
      <nav className={`navbar ${navScrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <button
            type="button"
            className="navbar-brand"
            onClick={() => scrollTo('home')}
            aria-label="Hallucination Detector home"
          >
            <span className="navbar-logo">
              <AppLogo />
            </span>
            <span className="navbar-title">Hallucination Detector</span>
          </button>

          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>

          <ul className={`nav-links ${mobileNavOpen ? 'open' : ''}`}>
            <li>
              <a href="#home" onClick={(e) => handleNavClick(e, 'home')}>
                Home
              </a>
            </li>
            <li>
              <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>
                How It Works
              </a>
            </li>
            <li>
              <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>
                About
              </a>
            </li>
            <li>
              <a
                href="#try-it"
                className="nav-cta"
                onClick={(e) => handleNavClick(e, 'try-it')}
              >
                Try It
              </a>
            </li>
          </ul>

          {apiOnline !== null && (
            <span
              className={`nav-status ${apiOnline ? 'online' : 'offline'}`}
              role="status"
            >
              {apiOnline ? 'Online' : 'Offline'}
            </span>
          )}
        </div>
      </nav>

      <section
        id="home"
        className={`hero ${heroVisible ? 'hero-visible' : ''}`}
      >
        <div className="hero-pattern" aria-hidden="true" />
        <div className="section-container hero-content">
          <span className="hero-badge">Neil Gogte Institute of Technology</span>
          <h1 className="hero-heading">LLM Hallucination Detector</h1>
          <p className="hero-subheading">
            An AI system that verifies medical LLM responses claim by claim
            using RAG and Agentic AI
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => scrollTo('try-it')}
            >
              Try It Now
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => scrollTo('how-it-works')}
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      <section className="section stats-section">
        <div className="section-container stats-grid">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section how-section">
        <div className="section-container">
          <h2 className="section-title reveal">How It Works</h2>
          <p className="section-subtitle reveal">
            A three-step pipeline from input to verified medical claims
          </p>
          <div className="steps-row reveal-left">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step-card">
                <div className="step-icon">{step.icon}</div>
                <span className="step-number">Step {i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section features-section">
        <div className="section-container">
          <h2 className="section-title reveal">Why Hallucination Detector?</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="feature-card reveal"
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              >
                <div className="feature-icon">
                  <AppLogo />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="try-it" className="section detector-section">
        <div className="section-container">
          <h2 className="section-title reveal">Try It Now</h2>
          <p className="section-subtitle reveal">
            Paste an LLM medical response or upload a file to analyze
          </p>

          {apiOnline === false && (
            <div className="api-banner" role="alert">
              API offline — start Spring Boot (8080) and Python ML service (8000)
            </div>
          )}
          {apiOnline === true && (
            <div className="api-banner api-online">System online</div>
          )}

          <div className="detector-panel reveal">
            <div className="input-panel">
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
            </div>

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
              <section className="results-panel results-fade-in">
                <h3>Analysis Results</h3>

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

                <h4 className="claims-heading">
                  Claim-by-Claim Analysis ({claims.length})
                </h4>

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

                      {claim.verdict === 'HALLUCINATED' &&
                        claim.correct_information && (
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
          </div>
        </div>
      </section>

      <section id="about" className="section about-section">
        <div className="section-container">
          <h2 className="section-title reveal">About This Project</h2>
          <div className="about-grid reveal">
            <div className="about-col">
              <h3>What is AI Hallucination?</h3>
              <p>
                AI hallucination occurs when large language models generate
                plausible-sounding but factually incorrect information. In
                medicine, a single wrong dosage, contraindication, or diagnosis
                can have serious consequences for patients and clinicians.
              </p>
              <h3>Why it matters in the medical domain</h3>
              <p>
                Healthcare professionals increasingly rely on LLM assistants for
                quick answers. Without verification, fabricated citations,
                outdated guidelines, and invented drug interactions can spread
                unchecked. Rigorous claim-level validation is essential before
                any AI output informs clinical decisions.
              </p>
            </div>
            <div className="about-col">
              <h3>How our system works differently</h3>
              <p>
                Hallucination Detector does not score text as a black box. It
                decomposes responses into atomic medical claims, retrieves
                evidence from a RAG knowledge base and live web search, and
                runs a multi-stage agentic pipeline to judge each claim with
                confidence and danger scores.
              </p>
              <h3>What makes it unique</h3>
              <p>
                Combined MedQuAD indexing, Tavily real-time search, Groq-powered
                reasoning agents, and a Spring Boot API gateway deliver a
                production-style architecture suitable for academic demonstration
                and further clinical research integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <AppLogo className="footer-logo" />
            <h3>Hallucination Detector</h3>
          </div>
          <p className="footer-college">
            A mini project by students of
            <br />
            <strong>Neil Gogte Institute of Technology</strong>
          </p>
          <p className="footer-tagline">
            Built with RAG + Agentic AI + Live Web Search
          </p>
          <a
            href={GITHUB_URL}
            className="footer-github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View project on GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 1.005-.315 3.3 1.23 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c0 0 2.295-1.56 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <p className="footer-copy">© 2025 Hallucination Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
