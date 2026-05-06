import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Polling every 5s — dashboard needs live-ish feel without WebSocket.
      refetchInterval: 5_000,
      // Refetch on window focus — nice when coming back to tab.
      refetchOnWindowFocus: true,
      // 10s stale time — fresh data when navigating routes.
      staleTime: 10_000,
      retry: 1,
    },
  },
});