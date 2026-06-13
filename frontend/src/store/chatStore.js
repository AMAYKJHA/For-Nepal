import { create } from "zustand";

/**
 * chatStore — ScholarAI conversation state and active view.
 */
export const useChatStore = create((set) => ({
  messages: [],
  model: "ScholarAI Fast",
  activeView: "chat",

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  setModel: (model) => set({ model }),
  setActiveView: (activeView) => set({ activeView }),
  clear: () => set({ messages: [] }),
}));
