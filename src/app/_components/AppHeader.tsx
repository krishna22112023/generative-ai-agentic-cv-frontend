"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import Image from "next/image";

export function AppHeader() {

  return (
    <div className="flex w-full items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Image
          src="/AgenticVision_icon.png"
          alt="AgenticVision icon"
          width={32}
          height={32}
        />
        <div className="leading-tight">
          <span className="font-semibold">AgenticVision</span>
          <br />
          <span className="text-xs text-gray-500">Powered by AI.DA ST Engineering</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal" />
          <SignUpButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
}
