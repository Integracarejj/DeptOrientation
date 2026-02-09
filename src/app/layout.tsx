/**
 * layout.tsx (Root Layout)
 * ------------------------------------
 * PURPOSE:
 * Root HTML layout for the entire application.
 *
 * IMPORTANT:
 * - This file MUST remain a Server Component
 * - We delegate all interactive UI to AppShellClient
 *
 * WHY:
 * - Prevents hydration mismatches
 * - Matches Next.js App Router best practices
 */

import "./globals.css";
import { AppShellClient } from "@/components/layout/AppShellClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShellClient>{children}</AppShellClient>
      </body>
    </html>
  );
}