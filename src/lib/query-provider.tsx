"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function QueryClientProvider({ children }: { children: ReactNode }) {
  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
}
