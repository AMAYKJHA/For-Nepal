'use client';

import Dashboard from '@/components/study/Dashboard';
import { useStudy } from '@/components/study/StudyContext';

export default function MemoryPage() {
  const { handleLoadMemoryChat } = useStudy();
  return <Dashboard onLoadChat={handleLoadMemoryChat} />;
}