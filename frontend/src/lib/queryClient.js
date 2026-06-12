import { QueryClient } from "@tanstack/react-query";

/**
 * queryClient — shared TanStack Query client instance.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
