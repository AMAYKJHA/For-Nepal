'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { pdfAPI } from '@/utils/client';
import styles from './PDFPanel.module.css';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const LEVEL_META = {
  beginner:     { label: 'Beginner',     color: '#27500A', bg: '#EAF3DE', border: '#3B6D11', desc: 'Recall & definitions' },
  intermediate: { label: 'Intermediate', color: '#633806', bg: '#FAEEDA', border: '#854F0B', desc: 'Understanding & relationships' },
  advanced:     { label: 'Advanced',     color: '#712B13', bg: '#FAECE7', border: '#993C1D', desc: 'Application & scenarios' },
  expert:       { label: 'Expert',       color: '#3C3489', bg: '#EEEDFE', border: '#534AB7', desc: 'Synthesis & critical analysis' },
};

// ── Slide-over panel ─────────────────────────────────────────────
export default function PDFPanel({ open, onClose, pdfDoc, onAttach, onDetach, initialTab = 'library' }) {
  const [tab, setTab] = useState(initialTab);
  const [toast, setToast] = useState('');

  // ✅ FIX: React 19 pattern to reset state without useEffect
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitial, setPrevInitial] = useState(initialTab);
  
  if (open !== prevOpen || initialTab !== prevInitial) {
    setPrevOpen(open);
    setPrevInitial(initialTab);
    if (open) {
      setTab(pdfDoc ? initialTab : 'library');
    }
  }

  const flash = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const tabs = pdfDoc
    ? [['summary', 'Summary'], ['quiz', 'Quiz'], ['library', 'Library']]
    : [['library', 'Library']];

  return (
    <>
      {open && (
        <div className={styles.overlay}>
          <div className={styles.backdrop} onClick={onClose} />

          <aside className={styles.panel}>
            <div className={styles.header}>
              <div className={`${styles.headerTop} ${!pdfDoc ? styles.headerTopNoDoc : ''}`}>
                <div className={styles.headerInfo}>
                  <span className={styles.docIcon}>📄</span>
                  <div className={styles.docTextWrap}>
                    <div className={styles.docTitle}>PDF Study</div>
                    {pdfDoc && <div className={styles.docSubtitle}>{pdfDoc.title}</div>}
                  </div>
                </div>
                <button onClick={onClose} title="Close" className={styles.closeBtn}>✕</button>
              </div>

              {pdfDoc && (
                <div className={styles.tabs}>
                  {tabs.map(([key, label]) => (
                    <button
                      key={key}
                      className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                      onClick={() => setTab(key)}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.body}>
              {tab === 'library' && (
                <LibraryView
                  pdfDoc={pdfDoc}
                  onAttach={(doc) => { onAttach(doc); setTab('summary'); flash(`✓ "${doc.title}" attached to this chat`); }}
                  onDetach={onDetach}
                  flash={flash}
                />
              )}
              {tab === 'summary' && pdfDoc && <SummaryView pdfDoc={pdfDoc} />}
              {tab === 'quiz' && pdfDoc && <QuizView pdfDoc={pdfDoc} flash={flash} />}
            </div>
          </aside>

          {toast && <div className={styles.toast}>{toast}</div>}
        </div>
      )}
    </>
  );
}

// ── Library: upload + browse previous PDFs ───────────────────────
function LibraryView({ pdfDoc, onAttach, onDetach, flash }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ Start as true
  const [uploading, setUploading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const fileRef = useRef();

  // ✅ FIX: Manual reload function (called after upload/delete)
  const load = () => {
    setLoading(true);
    pdfAPI.list()
      .then(({ data }) => setPdfs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // ✅ FIX: Initial fetch without calling setLoading(true) inside effect
  useEffect(() => {
    let active = true;
    pdfAPI.list()
      .then(({ data }) => { if (active) setPdfs(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('user_prompt', userPrompt);
    try {
      const { data } = await pdfAPI.upload(form);
      setUserPrompt('');
      flash('✓ PDF uploaded & processed');
      await load();
      onAttach({
        id: data.id, title: data.title, topic: data.topic,
        page_count: data.page_count, mastered: false,
      });
    } catch {
      flash('Upload failed. Check the backend.');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this PDF? This cannot be undone.')) return;
    try {
      await pdfAPI.remove(id);
      if (pdfDoc?.id === id) onDetach();
      flash('✓ PDF deleted');
      load();
    } catch {
      flash('Delete failed.');
    }
  };

  return (
    <div>
      <div className={styles.uploadBox}>
        <div className={styles.uploadTitle}>Upload a new PDF</div>
        <textarea
          rows={2}
          placeholder="Optional focus hint — e.g. 'Focus on the ML concepts' or 'I'm a beginner'"
          value={userPrompt}
          onChange={e => setUserPrompt(e.target.value)}
          className={styles.uploadTextarea}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`${styles.uploadBtn} ${uploading ? styles.uploadBtnDisabled : ''}`}
        >{uploading ? 'Processing…' : '⬆ Choose PDF & Upload'}</button>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      <div className={styles.libraryLabel}>Your PDFs</div>
      {loading ? (
        <div className={styles.loadingText}>Loading…</div>
      ) : pdfs.length === 0 ? (
        <div className={styles.emptyText}>No PDFs yet. Upload one above.</div>
      ) : (
        <div className={styles.pdfGrid}>
          {pdfs.map(pdf => {
            const isAttached = pdfDoc?.id === pdf.id;
            return (
              <div
                key={pdf.id}
                className={`${styles.pdfItem} ${isAttached ? styles.pdfItemAttached : ''}`}
              >
                <div className={styles.pdfItemTop}>
                  <div className={styles.pdfItemInfo}>
                    <div className={styles.pdfItemTitleRow}>
                      <span className={styles.pdfItemTitle}>{pdf.title}</span>
                      {pdf.mastered && <span className={styles.masteredBadge}>✓ Mastered</span>}
                    </div>
                    <div className={styles.pdfItemMeta}>{pdf.topic} · {pdf.page_count} pages</div>
                  </div>
                  <button onClick={e => handleDelete(pdf.id, e)} title="Delete PDF" className={styles.deleteBtn}>✕</button>
                </div>
                <div className={styles.pdfItemActions}>
                  {isAttached ? (
                    <button onClick={onDetach} className={styles.detachBtn}>✓ Attached — Detach</button>
                  ) : (
                    <button
                      onClick={() => onAttach({
                        id: pdf.id, title: pdf.title, topic: pdf.topic,
                        page_count: pdf.page_count, mastered: pdf.mastered,
                      })}
                      className={styles.attachBtn}
                    >Use in this chat →</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Summary ──────────────────────────────────────────────────────
function SummaryView({ pdfDoc }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Start as true

  // ✅ FIX: Initial fetch without calling setLoading(true) inside effect
  useEffect(() => {
    let active = true;
    pdfAPI.get(pdfDoc.id)
      .then(({ data }) => { if (active) { setDetail(data); } })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pdfDoc.id]);

  if (loading) return <div className={styles.loadingText}>Loading summary…</div>;
  if (!detail) return <div className={styles.emptyText}>Could not load summary.</div>;

  return (
    <div className={styles.summaryWrap}>
      {detail.user_prompt && (
        <div className={styles.focusNote}>
          <strong>Your focus note:</strong> {detail.user_prompt}
        </div>
      )}
      <ReactMarkdown>{detail.summary || '_No summary available._'}</ReactMarkdown>
    </div>
  );
}

// ── Quiz ─────────────────────────────────────────────────────────
function QuizView({ pdfDoc, flash }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Start as true
  const [generating, setGenerating] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);

  // ✅ FIX: Manual reload function
  const reload = () => {
    setLoading(true);
    pdfAPI.get(pdfDoc.id)
      .then(({ data }) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // ✅ FIX: Initial fetch without calling setLoading(true) inside effect
  useEffect(() => {
    let active = true;
    pdfAPI.get(pdfDoc.id)
      .then(({ data }) => { if (active) setDetail(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pdfDoc.id]);

  const generate = async (level) => {
    setGenerating(level);
    try {
      await pdfAPI.generateQuiz(pdfDoc.id, level);
      flash(`✓ ${LEVEL_META[level].label} quiz ready`);
      reload();
    } catch {
      flash('Quiz generation failed');
    }
    setGenerating(null);
  };

  if (activeLevel) {
    return (
      <QuizRunner
        docId={pdfDoc.id}
        level={activeLevel}
        onBack={() => { setActiveLevel(null); reload(); }}
        flash={flash}
      />
    );
  }

  if (loading) return <div className={styles.loadingText}>Loading…</div>;

  return (
    <div className={styles.quizWrap}>
      <p className={styles.quizIntro}>
        Quizzes are automatically generated for all levels. Pass at 80%+ to proceed.
      </p>
      {LEVELS.map(level => {
        const meta = LEVEL_META[level];
        const count = detail?.quiz_counts?.[level] || 0;
        const isReady = count > 0;
        
        return (
          <div 
            key={level} 
            className={styles.levelCard}
            style={{ background: meta.bg, border: `0.5px solid ${meta.border}` }}
          >
            <div className={styles.levelTop}>
              <div className={styles.levelInfo}>
                <div className={styles.levelTitle} style={{ color: meta.color }}>{meta.label}</div>
                <div className={styles.levelDesc} style={{ color: meta.border }}>{meta.desc}</div>
                {isReady ? (
                  <div className={styles.levelCount} style={{ color: meta.border }}>{count} questions ready</div>
                ) : (
                  <div className={`${styles.levelCount} ${styles.levelCountMissing}`} style={{ color: meta.border }}>Missing questions</div>
                )}
              </div>
            </div>
            <div className={styles.levelActions}>
              {isReady ? (
                <button
                  onClick={() => setActiveLevel(level)}
                  className={styles.levelTakeBtn}
                  style={{ background: meta.color }}
                >Take Quiz →</button>
              ) : (
                <button
                  onClick={() => generate(level)}
                  disabled={generating === level}
                  className={`${styles.levelGenBtn} ${generating === level ? styles.levelGenBtnDisabled : ''}`}
                  style={{ border: `0.5px solid ${meta.border}`, color: meta.border }}
                >{generating === level ? 'Generating...' : 'Click to retry generation'}</button>
              )}
            </div>
          </div>
        );
      })}
      <button onClick={reload} className={styles.refreshBtn}>↻ Refresh Status</button>
    </div>
  );
}

function QuizRunner({ docId, level, onBack, flash }) {
  const meta = LEVEL_META[level];
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    pdfAPI.getQuiz(docId, level)
      .then(({ data }) => { setQuestions(data.questions); setLoading(false); })
      .catch(() => setLoading(false));
  }, [docId, level]);

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) {
      flash('Answer all questions first');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await pdfAPI.submitQuiz(docId, level, answers);
      setResult(data);
    } catch {
      flash('Submit failed');
    }
    setSubmitting(false);
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div className={styles.runnerTop}>
        <button onClick={onBack} className={styles.backBtn}>← Levels</button>
        <span 
          className={styles.levelBadge}
          style={{ background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}` }}
        >{meta.label}</span>
      </div>

      {result && <ResultBanner result={result} meta={meta} onRetry={onBack} />}

      {loading ? (
        <div className={styles.loadingText}>Loading questions…</div>
      ) : (
        <div className={styles.questionList}>
          {questions.map((q, idx) => {
            const feedback = result?.results?.find(r => r.id === q.id);
            return (
              <div key={q.id} className={styles.questionCard}>
                <div className={styles.questionNum}>Question {idx + 1}</div>
                <div className={styles.questionText}>{q.question}</div>
                <div className={styles.options}>
                  {q.options.map((opt, i) => {
                    const letter = letters[i];
                    const isSelected = answers[q.id] === letter;
                    const isCorrect = feedback?.correct_answer === letter;
                    const isWrong = feedback && feedback.user_answer === letter && !feedback.is_correct;

                    let optionClass = styles.option;
                    if (result) optionClass += ` ${styles.optionDisabled}`;
                    if (feedback && isCorrect) optionClass += ` ${styles.optionCorrect}`;
                    else if (feedback && isWrong) optionClass += ` ${styles.optionWrong}`;
                    else if (!result && isSelected) optionClass += ` ${styles.optionSelected}`;

                    return (
                      <div
                        key={letter}
                        onClick={() => { if (!result) setAnswers(a => ({ ...a, [q.id]: letter })); }}
                        className={optionClass}
                      >{opt}</div>
                    );
                  })}
                </div>
                {feedback?.explanation && <div className={styles.explanation}>{feedback.explanation}</div>}
              </div>
            );
          })}
        </div>
      )}

      {!result && !loading && questions.length > 0 && (
        <button
          onClick={submit}
          disabled={submitting}
          className={`${styles.submitBtn} ${submitting ? styles.submitBtnDisabled : ''}`}
        >{submitting ? 'Checking…' : `Submit (${Object.keys(answers).length}/${questions.length})`}</button>
      )}
    </div>
  );
}

function ResultBanner({ result, meta, onRetry }) {
  const passed = result.passed;
  return (
    <div className={`${styles.resultBanner} ${passed ? styles.resultBannerPassed : styles.resultBannerFailed}`}>
      <div className={`${styles.resultTitle} ${passed ? styles.resultTitlePassed : styles.resultTitleFailed}`}>
        {passed ? '✓ Passed!' : '✗ Not quite'}
        {result.mastery_unlocked && ' · PDF Mastered 🎓'}
      </div>
      <div className={`${styles.resultScore} ${passed ? styles.resultScorePassed : styles.resultScoreFailed}`}>
        {result.correct}/{result.total} correct · {result.score}%
        {!passed && ` — need 80% to pass ${meta.label}`}
      </div>
      {!passed && <button onClick={onRetry} className={styles.retryBtn}>Try again →</button>}
    </div>
  );
}