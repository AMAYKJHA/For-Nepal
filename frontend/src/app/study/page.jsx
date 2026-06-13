'use client';

import Chat from '@/components/study/Chat';
import { useStudy } from '@/components/study/StudyContext';

export default function StudyPage() {
  const { activeSession, activeSessionId, handleUpdateSession } = useStudy();
  
  return activeSession ? (
    <Chat
      key={activeSessionId}
      session={activeSession}
      onUpdate={(updates) => handleUpdateSession(activeSessionId, updates)}
    />
  ) : null;
}