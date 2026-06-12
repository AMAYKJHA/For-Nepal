"use client";

import { useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import api from "@/lib/api";

/**
 * useChat — sends a message to ScholarAI and stores the response.
 */
export function useChat() {
  const { messages, addMessage, model } = useChatStore();

  const sendMessage = useCallback(
    async (text) => {
      addMessage({ role: "user", text });
      const { data } = await api.post("/chat", { text, model });
      addMessage({ role: "assistant", text: data.reply });
      return data;
    },
    [addMessage, model]
  );

  return { messages, sendMessage };
}
