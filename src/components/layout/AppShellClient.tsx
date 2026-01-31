/**
 * AppShellClient.tsx
 * ------------------------------------
 * PURPOSE:
 * Client-only wrapper for the AppShell.
 *
 * WHY THIS EXISTS:
 * - Prevents React hydration mismatches
 * - Ensures all interactive layout UI (sidebar, header, routing)
 *   renders ONLY on the client
 *
 * WHAT IT DOES:
 * - Acts as a strict client boundary
 * - Delegates all layout rendering to AppShell
 */

"use client";

import { AppShell } from "./AppShell";

export function AppShellClient({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}