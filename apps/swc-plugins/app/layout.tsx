import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { SessionProvider } from "next-auth/react";
import { Manrope } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { PropsWithChildren } from "react";
import "../styles/globals.css";
import { ClientProviders } from "./client-providers";

const fontHeading = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const fontBody = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang={"en"}>
      <body
        className={cn("antialiased", fontHeading.variable, fontBody.variable)}
      >
        <NextTopLoader color={"var(--colors-primary)"} />

        <SessionProvider>
          <ClientProviders>{children}</ClientProviders>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
