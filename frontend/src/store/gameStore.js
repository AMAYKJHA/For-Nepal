import { create } from "zustand";

/**
 * gameStore — HP, question queue, current level, and battle status.
 */
export const useGameStore = create((set) => ({
  hp: 100,
  maxHp: 100,
  enemyHp: 60,
  level: 1,
  queue: [],
  status: "idle", // idle | playing | victory | gameover

  setHp: (hp) => set({ hp }),
  setEnemyHp: (enemyHp) => set({ enemyHp }),
  setLevel: (level) => set({ level }),
  enqueueQuestion: (q) => set((s) => ({ queue: [...s.queue, q] })),
  dequeueQuestion: () =>
    set((s) => ({ queue: s.queue.slice(1) })),
  setStatus: (status) => set({ status }),
  reset: () =>
    set({ hp: 100, enemyHp: 60, queue: [], status: "idle" }),
}));
