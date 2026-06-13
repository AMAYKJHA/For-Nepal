'use client';

import Search from '@/components/study/Search';
import { useStudy } from '@/components/study/StudyContext';

export default function SearchPage() {
  const { handleLoadMemoryChat } = useStudy();
  return <Search onLoadChat={handleLoadMemoryChat} />;
}