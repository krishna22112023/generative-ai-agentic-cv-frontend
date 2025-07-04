"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-2 pt-4">
      {/* Top Row: logo + auth */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/AgenticVision_icon.png" alt="AgenticVision icon" width={32} height={32} />
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

      {/* Navigation row only on chat page */}
      {pathname === "/" && (
        <div className="mt-2 flex items-center">
          <Link href="/projects" passHref legacyBehavior>
            <Button className="bg-black text-white hover:bg-black/80" size="sm">
              Back to projects
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
