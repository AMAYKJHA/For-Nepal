'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const StudyContext = createContext(null);

const generateId = () => Math.random().toString(36).slice(2, 11);

const createSession = () => ({
  id: generateId(),
  title: 'New Chat',
  messages: [{
    role: 'assistant',
    content: "Hi! I'm **ManageAI** — your intelligent assistant with persistent memory. Every conversation I have with you gets saved, tagged, and made searchable.\n\nYou can also upload images for analysis. What would you like to explore today?",
    id: 'welcome',
  }],
  createdAt: new Date().toISOString(),
  topic: null,
});

// ✅ Static default for SSR to prevent hydration mismatch (No Math.random or new Date)
const SSR_DEFAULT_SESSION = {
  id: 'ssr-default',
  title: 'New Chat',
  messages: [{
    role: 'assistant',
    content: "Hi! I'm **ManageAI**...",
    id: 'welcome',
  }],
  createdAt: '2024-01-01T00:00:00.000Z', 
  topic: null,
};

const STORAGE_KEY = 'manageai_sessions_v2';

const loadSessions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [createSession()];
};

export function StudyProvider({ children }) {
  const router = useRouter();
  
  // ✅ 1. Initialize with 100% static values for SSR
  const [sessions, setSessions] = useState([SSR_DEFAULT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState('ssr-default');
  const [isMounted, setIsMounted] = useState(false);

  // ✅ 2. Hydrate from localStorage ONLY after the component mounts on the client
  useEffect(() => {
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);
    setActiveSessionId(loadedSessions[0]?.id);
    setIsMounted(true);
  }, []);

  // ✅ 3. Persist to localStorage when sessions change (only after mount)
  useEffect(() => {
    if (isMounted) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch {}
    }
  }, [sessions, isMounted]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const handleNewChat = () => {
    const s = createSession();
    setSessions(prev => [s, ...prev]);
    setActiveSessionId(s.id);
    router.push('/study');
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    router.push('/study');
  };

  const handleUpdateSession = (id, updates) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSession = (id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const s = createSession();
        setActiveSessionId(s.id);
        return [s];
      }
      if (activeSessionId === id) setActiveSessionId(next[0].id);
      return next;
    });
  };

  const handleLoadMemoryChat = (memory) => {
    const s = {
      id: generateId(),
      title: memory.question.slice(0, 45) + (memory.question.length > 45 ? '…' : ''),
      messages: [
        { role: 'assistant', content: "Hi! I'm **ManageAI**...", id: 'welcome' },
        { role: 'user', content: memory.question, id: generateId() },
        { role: 'assistant', content: memory.answer, topic: memory.topic, saved: true, id: generateId() },
      ],
      createdAt: memory.created_at,
      topic: memory.topic,
      fromMemory: true,
    };
    setSessions(prev => [s, ...prev]);
    setActiveSessionId(s.id);
    router.push('/study');
  };

  return (
    <StudyContext.Provider value={{
      sessions, activeSessionId, activeSession,
      handleNewChat, handleSelectSession, handleUpdateSession, 
      handleDeleteSession, handleLoadMemoryChat
    }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  return useContext(StudyContext);
}