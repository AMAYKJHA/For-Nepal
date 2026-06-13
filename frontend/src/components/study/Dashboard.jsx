'use client';

import { useState, useEffect } from 'react';
import { memoryAPI, topicAPI, flashcardAPI, analyticsAPI } from '@/utils/client';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import styles from './Dashboard.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const TOPIC_COLORS = {
  Algorithms: '#059669', Programming: '#2563eb',
  Math: '#7c3aed',      Physics: '#dc2626',
  Database: '#d97706',  General: '#6b7280',
};

const TOPIC_BG = {
  Algorithms: '#ecfdf5', Programming: '#eff6ff',
  Math:        '#f5f3ff', Physics:     '#fef2f2',
  Database:    '#fffbeb', General:     '#f9fafb',
};

function StatCard({ label, value, accent }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: accent || '#7c6af7' }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function Dashboard({ onLoadChat }) {
  const [memories, setMemories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [memRes, topicRes, analyticsRes] = await Promise.all([
        memoryAPI.getAll(filter),
        topicAPI.getTopics(),
        analyticsAPI.learning(),
      ]);
      setMemories(memRes.data);
      setTopics(topicRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await memoryAPI.delete(id);
      setMemories(prev => prev.filter(m => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) { console.error(err); }
    setDeletingId(null);
  };

  const handleBulkFlashcards = async () => {
    setGenerating(true);
    try { await flashcardAPI.bulkGenerate(); } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const stripMarkdown = (text) => {
    return text
      .replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
      .replace(/___(.+?)___/g, '$1').replace(/__(.+?)__/g, '$1').replace(/_(.+?)_/g, '$1')
      .replace(/#{1,6}\s+(.+)/g, '$1').replace(/^\s*[-*+]\s+/gm, '• ').replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1').replace(/^>\s+/gm, '').replace(/---+/g, '').replace(/\n{3,}/g, '\n\n').trim();
  };

  const formatMemoryWithAI = async (memory) => {
    try {
      const res = await fetch(`${API_BASE}/format-memory/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: memory.question, answer: memory.answer }),
      });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      return { question: data.question, answer: data.answer };
    } catch {
      return { question: stripMarkdown(memory.question), answer: stripMarkdown(memory.answer) };
    }
  };

  const handleExportPDF = async () => {
    if (memories.length === 0) return;
    setExporting(true);
    setExportProgress('Formatting memories with AI...');

    const formatted = [];
    for (let i = 0; i < memories.length; i++) {
      setExportProgress(`Formatting memory ${i + 1} of ${memories.length}...`);
      const result = await formatMemoryWithAI(memories[i]);
      formatted.push({ ...memories[i], ...result });
    }

    setExportProgress('Building PDF...');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 22;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;
    let pageNum = 1;

    const addFooter = () => {
      doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont(undefined, 'normal');
      doc.text('ManageAI Memory Export', margin, pageHeight - 8);
      const pStr = `Page ${pageNum}`;
      doc.text(pStr, pageWidth - margin - doc.getTextWidth(pStr), pageHeight - 8);
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    };

    const newPage = () => { addFooter(); doc.addPage(); pageNum++; y = margin; };
    const checkSpace = (needed) => { if (y + needed > pageHeight - 18) newPage(); };

    doc.setFillColor(40, 40, 40); doc.rect(0, 0, pageWidth, 4, 'F'); y = 52;
    doc.setFontSize(28); doc.setTextColor(20, 20, 20); doc.setFont(undefined, 'bold');
    doc.text('ManageAI', margin, y); y += 10;
    doc.setFontSize(13); doc.setTextColor(80, 80, 80); doc.setFont(undefined, 'normal');
    doc.text('Memory Export Report', margin, y); y += 18;
    doc.setDrawColor(40, 40, 40); doc.setLineWidth(1);
    doc.line(margin, y, margin + 40, y); y += 20;
    doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 7;
    doc.text(`Total memories: ${memories.length}`, margin, y); y += 7;
    if (filter) { doc.text(`Topic filter: ${filter}`, margin, y); y += 7; }
    addFooter(); doc.addPage(); pageNum++; y = margin;

    formatted.forEach((m, idx) => {
      checkSpace(40);
      doc.setFontSize(9); doc.setTextColor(140, 140, 140); doc.setFont(undefined, 'normal');
      doc.text(`#${idx + 1}  •  ${m.topic || 'General'}  •  ${new Date(m.created_at).toLocaleDateString()}`, margin, y); y += 7;
      doc.setFontSize(11.5); doc.setTextColor(20, 20, 20); doc.setFont(undefined, 'bold');
      const qLines = doc.splitTextToSize(m.question, contentWidth);
      checkSpace(qLines.length * 6 + 6); doc.text(qLines, margin, y); y += qLines.length * 6 + 5;
      doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
      const aLines = doc.splitTextToSize(m.answer, contentWidth);
      const aHeight = aLines.length * 5.5;
      checkSpace(aHeight + 14); doc.text(aLines, margin, y); y += aHeight + 14;
      if (idx < formatted.length - 1) {
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.15);
        doc.line(margin, y - 7, pageWidth - margin, y - 7);
      }
    });

    addFooter(); doc.save('manageai-memories.pdf');
    setExporting(false); setExportProgress('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Memory Vault</h1>
            <p className={styles.subtitle}>
              {memories.length > 0
                ? `${memories.length} saved memories across ${topics.length} topic${topics.length !== 1 ? 's' : ''}`
                : 'Your knowledge base grows with every conversation'}
            </p>
          </div>
          <div className={styles.headerActions}>
            {exporting && (
              <div className={styles.exportStatus}>
                <span className={styles.spinIcon}>◌</span>{exportProgress}
              </div>
            )}
            <div className={styles.btnRow}>
              <button className={`${styles.btn} ${styles.exportBtn}`} onClick={handleExportPDF} disabled={memories.length === 0 || exporting}>
                <span>{exporting ? '◌' : '↓'}</span>{exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button className={`${styles.btn} ${styles.genBtn}`} onClick={handleBulkFlashcards} disabled={generating}>
                <span>✦</span>{generating ? 'Generating flashcards…' : 'Auto-generate flashcards'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.statsGrid4}>
          <StatCard label="Mastery score" value={Math.round(analytics?.mastery_score || 0)} accent="#7c6af7" />
          <StatCard label="Topics learned" value={analytics?.topics_learned || topics.length} accent="#2563eb" />
          <StatCard label="Topics struggling" value={analytics?.topics_struggling || 0} accent="#dc2626" />
          <StatCard label="Study streak" value={analytics?.study_streak || 0} accent="#d97706" />
        </div>

        <div className={styles.statsGrid3}>
          <StatCard label="Quiz accuracy" value={`${Math.round(analytics?.quiz_accuracy || 0)}%`} accent="#0f766e" />
          <StatCard label="Revision completion" value={`${Math.round(analytics?.revision_completion_rate || 0)}%`} accent="#0369a1" />
          <StatCard label="Flashcards reviewed" value={analytics?.flashcards_reviewed || 0} accent="#166534" />
        </div>

        {analytics?.topic_mastery?.length > 0 && (
          <div className={styles.chartWrap}>
            <div className={styles.chartTitle}>Topic Mastery Analytics</div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer>
                <BarChart data={analytics.topic_mastery}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="topic" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="mastery_score" fill="#7c6af7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={styles.filters}>
          <button className={`${styles.filterPill} ${!filter ? styles.filterPillActive : ''}`} onClick={() => setFilter(null)}>
            All ({memories.length})
          </button>
          {topics.map(t => (
            <button
              key={t.topic}
              className={`${styles.filterPill} ${filter === t.topic ? styles.filterPillActive : ''}`}
              onClick={() => setFilter(t.topic)}
              style={{
                background: filter === t.topic ? TOPIC_BG[t.topic] || '#f9fafb' : undefined,
                borderColor: filter === t.topic ? (TOPIC_COLORS[t.topic] || '#6b7280') + '55' : undefined,
                color: filter === t.topic ? (TOPIC_COLORS[t.topic] || '#6b7280') : undefined,
              }}
            >{t.topic} ({t.count})</button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingIcon}>◌</div>
            <div className={styles.loadingText}>Loading memories…</div>
          </div>
        ) : memories.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon}>🧠</div>
            <div className={styles.emptyTitle}>No memories yet</div>
            <div className={styles.emptySub}>Start a chat to build your knowledge vault</div>
          </div>
        ) : (
          <div className={styles.memoryList}>
            {memories.map(m => {
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className={styles.memoryCard} onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                  <div className={styles.memTop}>
                    <div className={styles.memDot} style={{ background: TOPIC_COLORS[m.topic] || '#6b7280', boxShadow: `0 0 6px ${TOPIC_COLORS[m.topic] || '#6b7280'}55` }} />
                    <div className={styles.memQuestion}>{m.question}</div>
                    <span className={styles.memDate}>{new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className={`${styles.memAnswer} ${!isExpanded ? styles.memAnswerClamped : ''}`}>{m.answer}</div>

                  <div className={styles.memActions}>
                    <span className={styles.topicBadge} style={{
                      background: TOPIC_BG[m.topic] || '#f9fafb',
                      color: TOPIC_COLORS[m.topic] || '#6b7280',
                      border: `1px solid ${TOPIC_COLORS[m.topic] || '#6b7280'}25`,
                    }}>{m.topic}</span>

                    <div className={styles.memSpacer} />

                    <button className={styles.loadChatBtn} onClick={(e) => { e.stopPropagation(); onLoadChat(m); }}>💬 Open in Chat</button>
                    <button className={styles.deleteMemBtn} onClick={(e) => handleDelete(m.id, e)} disabled={deletingId === m.id}>
                      {deletingId === m.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}