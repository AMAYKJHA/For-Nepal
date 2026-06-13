'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI, pdfAPI } from '@/utils/client';
import PDFPanel from './PDFPanel';
import styles from './Chat.module.css';

const TOPIC_COLORS = {
  Algorithms: '#059669', Programming: '#2563eb', Math: '#7c3aed',
  Physics: '#dc2626', Database: '#d97706', General: '#6b7280', Geography: '#0891b2',
};

const TOPIC_BG = {
  Algorithms: '#ecfdf5', Programming: '#eff6ff', Math: '#f5f3ff',
  Physics: '#fef2f2', Database: '#fffbeb', General: '#f9fafb', Geography: '#ecfeff',
};

const AVAILABLE_MODELS = [
  { key: 'llama-3.3-70b', label: 'Llama 3.3 70B', desc: 'Best quality' },
  { key: 'llama-3.1-8b', label: 'Llama 3.1 8B', desc: 'Fastest' },
  { key: 'mixtral-8x7b', label: 'Mixtral 8x7B', desc: 'Great for code' },
];

const generateId = () => Math.random().toString(36).slice(2, 11);
const formatTime = (date) => new Date(date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── Markdown components ─────────────────────────────────────
const mdComponents = {
  code({ inline, className, children }) {
    if (inline) return <code className={styles.inlineCode}>{children}</code>;
    return (
      <pre className={styles.codeBlock}>
        <code>{children}</code>
      </pre>
    );
  },
  p: ({ node, children }) => {
    const hasBlock = node?.children?.some(child => ['pre', 'div', 'ul', 'ol'].includes(child.tagName));
    return hasBlock ? <>{children}</> : <p className={styles.mdP}>{children}</p>;
  },
  ul: ({ children }) => <ul className={styles.mdList}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.mdList}>{children}</ol>,
  li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
  h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
  blockquote: ({ children }) => <blockquote className={styles.mdQuote}>{children}</blockquote>,
  strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className={styles.mdLink}>{children}</a>,
};

// ── Message bubble ──────────────────────────────────────────
function MessageBubble({ msg, isLast, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const isUser = msg.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(msg.content.replace(/```[\s\S]*?```/g, 'code block.').replace(/[#*`]/g, ''));
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : styles.assistantRow}`}>
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.aiAvatar}`}>
        {isUser ? 'U' : 'M'}
      </div>

      <div className={styles.messageContent}>
        <div className={styles.messageHeader}>
          <span className={styles.roleName}>{isUser ? 'You' : 'ManageAI'}</span>
          {!isUser && msg.model_used && <span className={styles.modelBadge}>{msg.model_used}</span>}
          <span className={styles.timestamp}>{formatTime(msg.created_at)}</span>
        </div>

        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          {isUser ? (
            <p className={styles.userText}>{msg.content}</p>
          ) : (
            <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
          )}
        </div>

        <div className={styles.messageFooter}>
          {msg.topic && (
            <span className={styles.topicBadge} style={{ background: TOPIC_BG[msg.topic], color: TOPIC_COLORS[msg.topic] }}>
              {msg.topic}
            </span>
          )}
          
          {!isUser && (
            <div className={styles.actions}>
              <button onClick={handleSpeak} className={`${styles.iconBtn} ${speaking ? styles.active : ''}`} title={speaking ? 'Stop' : 'Read aloud'}>
                {speaking ? '⏹' : '🔊'}
              </button>
              <button onClick={handleCopy} className={`${styles.iconBtn} ${copied ? styles.active : ''}`} title="Copy">
                {copied ? '✓' : '📋'}
              </button>
              {isLast && (
                <button onClick={onRegenerate} className={styles.iconBtn} title="Regenerate">
                  🔄
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading dots ────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <div className={`${styles.avatar} ${styles.aiAvatar}`}>M</div>
      <div className={styles.messageContent}>
        <div className={styles.messageHeader}>
          <span className={styles.roleName}>ManageAI</span>
        </div>
        <div className={`${styles.bubble} ${styles.aiBubble} ${styles.loadingBubble}`}>
          <div className={styles.dots}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Model selector ─────────────────────────────────────────
function ModelSelector({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = AVAILABLE_MODELS.find(m => m.key === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={styles.modelSelector}>
      <button onClick={() => setOpen(!open)} className={styles.modelBtn}>
        <span>🤖</span> {current.label} <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.modelDropdown}>
          {AVAILABLE_MODELS.map(m => (
            <button key={m.key} onClick={() => { onSelect(m.key); setOpen(false); }} className={`${styles.modelOption} ${selectedModel === m.key ? styles.selected : ''}`}>
              <span className={styles.modelLabel}>{m.label}</span>
              <span className={styles.modelDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Chat component ─────────────────────────────────────
export default function Chat({ session, onUpdate }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b');
  const [tutorMode, setTutorMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('library');
  
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const messages = session?.messages || [];
  const pdfDoc = session?.pdfDoc || null;

  const openPanel = (tab) => { setPanelTab(tab); setPanelOpen(true); };
  const attachPdf = (doc) => onUpdate({ pdfDoc: doc });
  const detachPdf = () => onUpdate({ pdfDoc: null });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userContent = input.trim();
    setInput('');
    
    const userMsg = { role: 'user', content: userContent, id: generateId(), created_at: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    const titleUpdate = messages.length <= 1 ? { title: userContent.slice(0, 50) + (userContent.length > 50 ? '…' : '') } : {};
    
    onUpdate({ messages: newMessages, ...titleUpdate });
    setLoading(true);

    try {
      const history = newMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      const res = await chatAPI.sendMessage(userContent, history, null, selectedModel, tutorMode);
      const { answer, topic, model_used } = res.data;
      
      const assistantMsg = { role: 'assistant', content: answer, topic, saved: true, model_used, id: generateId(), created_at: new Date().toISOString() };
      onUpdate({ messages: [...newMessages, assistantMsg], topic });
    } catch {
      onUpdate({ messages: [...newMessages, { role: 'assistant', content: '⚠️ Error connecting to the server.', id: generateId() }] });
    }
    setLoading(false);
  }, [input, loading, messages, onUpdate, selectedModel, tutorMode, pdfDoc]);

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove last AI message and resend
      const filtered = messages.slice(0, -1);
      onUpdate({ messages: filtered });
      setTimeout(() => {
        setInput(lastUserMsg.content);
        // We can't easily trigger send automatically without a slight hack, 
        // but updating state and calling send is fine.
        // For simplicity, we'll just set input and let user hit enter, 
        // OR we can call the API directly. Let's call API directly:
        setLoading(true);
        chatAPI.sendMessage(lastUserMsg.content, filtered.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })), null, selectedModel, tutorMode)
          .then(res => {
            const { answer, topic, model_used } = res.data;
            onUpdate({ messages: [...filtered, { role: 'assistant', content: answer, topic, saved: true, model_used, id: generateId(), created_at: new Date().toISOString() }], topic });
          })
          .catch(() => onUpdate({ messages: [...filtered, { role: 'assistant', content: '⚠️ Error regenerating.', id: generateId() }] }))
          .finally(() => setLoading(false));
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.messagesArea}>
        {messages.map((msg, i) => (
          <MessageBubble 
            key={msg.id || i} 
            msg={msg} 
            isLast={i === messages.length - 1 && msg.role === 'assistant'} 
            onRegenerate={handleRegenerate}
          />
        ))}
        {loading && <LoadingDots />}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputInner}>
          {pdfDoc && (
            <div className={styles.pdfChip}>
              <span>📄</span>
              <span className={styles.pdfTitle}>{pdfDoc.title}</span>
              <button onClick={detachPdf} className={styles.detachBtn}>✕</button>
            </div>
          )}

          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pdfDoc ? `Ask about ${pdfDoc.title}…` : 'Ask ManageAI anything...'}
              rows={1}
              className={styles.textarea}
            />

            <div className={styles.toolbar}>
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
              
              <button onClick={() => openPanel(pdfDoc ? 'summary' : 'library')} className={`${styles.toolBtn} ${pdfDoc ? styles.toolBtnActive : ''}`} title="PDFs">
                📎 {pdfDoc && <span className={styles.toolLabel}>PDF</span>}
              </button>

              <button onClick={() => setTutorMode(!tutorMode)} className={`${styles.toolBtn} ${tutorMode ? styles.toolBtnActive : ''}`} title="Tutor Mode">
                🧭 {tutorMode && <span className={styles.toolLabel}>Tutor</span>}
              </button>

              <div className={styles.spacer} />

              <span className={styles.hint}>Shift+Enter for newline</span>

              <button onClick={sendMessage} disabled={!input.trim() || loading} className={styles.sendBtn}>
                {loading ? <span className={styles.loadingIcon}>◌</span> : 'Send ↑'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PDFPanel open={panelOpen} onClose={() => setPanelOpen(false)} pdfDoc={pdfDoc} onAttach={attachPdf} onDetach={detachPdf} initialTab={panelTab} />
    </div>
  );
}