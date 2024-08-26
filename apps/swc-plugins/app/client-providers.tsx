"use client";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "next-themes";
import { PropsWithChildren } from "react";
import { ApiClientProvider } from "./api-client-provider";

export function ClientProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class">
      <ApiClientProvider>
        <JotaiProvider>{children}</JotaiProvider>
      </ApiClientProvider>
    </ThemeProvider>
  );
}
