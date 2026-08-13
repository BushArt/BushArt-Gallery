"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { LoginModal } from "./LoginModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <LoginModal />
    </AuthProvider>
  );
}
