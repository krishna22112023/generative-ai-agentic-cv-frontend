"use client";

import { SignIn } from "@clerk/clerk-react";
import Image from "next/image";

export default function Landing() {
  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <header className="flex items-center px-8 py-4">
        <Image
          src="/AgenticVision_icon.png"
          alt="AgenticVision icon"
          width={40}
          height={40}
        />
        <div className="ml-2">
          <h1 className="text-lg font-semibold leading-none">AgenticVision</h1>
          <p className="text-xs text-gray-500">Powered by AI.DA ST Engineering</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-between px-8">
        {/* Left content */}
        <div className="max-w-xl">
          <h2 className="text-6xl font-extrabold leading-tight">
            <span className="text-blue-600">Agentic</span> Vision
          </h2>
          <p className="mt-4 text-xl text-gray-700">
            Building Vision models from data to production
          </p>
        </div>

        {/* Right content: Clerk SignIn */}
        <div className="ml-auto flex shrink-0 items-center justify-center pr-16">
          <SignIn afterSignInUrl="/projects" />
        </div>
      </main>
    </div>
  );
} 