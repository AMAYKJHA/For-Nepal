"use client";

import { useState, useCallback } from "react";

/**
 * useGameSession — manages the lifecycle of a single battle session.
 */
export function useGameSession() {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const startSession = useCallback(async (levelId) => {
    setLoading(true);
    try {
      // const { data } = await api.post("/sessions", { levelId });
      // setSessionId(data.id);
      setSessionId(`local-${levelId}-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const endSession = useCallback(() => setSessionId(null), []);

  return { sessionId, loading, startSession, endSession };
}
