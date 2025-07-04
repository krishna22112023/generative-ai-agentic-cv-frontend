"use client";
import { ClerkProvider } from "@clerk/clerk-react";
import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function ClientClerkProvider({ children }: Props) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY ??
    "";

  if (!publishableKey) {
    console.warn("Clerk publishable key is missing");
  }

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" afterSignInUrl="/projects">
      {children}
    </ClerkProvider>
  );
} 