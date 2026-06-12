"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * useLeaderboard — fetches ranked scholars via TanStack Query.
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await api.get("/leaderboard");
      return data;
    },
  });
}
