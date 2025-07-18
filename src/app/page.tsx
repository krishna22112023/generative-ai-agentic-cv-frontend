"use client";

import { SignedIn, SignedOut } from "@clerk/clerk-react";
import Landing from "./_components/Landing";
import { nanoid } from "nanoid";
import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";

import { useAutoScrollToBottom } from "~/components/hooks/useAutoScrollToBottom";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TooltipProvider } from "~/components/ui/tooltip";
import { sendMessage, useInitTeamMembers, useStore } from "~/core/store";
import { cn } from "~/core/utils";

import { AppHeader } from "./_components/AppHeader";
import { InputBox } from "./_components/InputBox";
import { MessageHistoryView } from "./_components/MessageHistoryView";
import { SideMenu } from "./_components/SideMenu";

function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<{ id: string; project_name: string; bucket_name?: string; description?: string } | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Holds the version id to use when sending messages
  const [versionId, setVersionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = useStore((state) => state.messages);
  const responding = useStore((state) => state.responding);

  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  // ------------------------------
  // Determine the versionId to use
  // ------------------------------
  useEffect(() => {
    // If the version id is already provided in the URL, just use it
    const urlVersionId = searchParams.get("versionId");
    if (urlVersionId) {
      setVersionId(urlVersionId);
      return;
    }

    // Otherwise, try to fetch the latest version for the project.
    if (!projectId) return;

    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId!}/versions`);
        if (!res.ok) return;
        const list: { id: string }[] = await res.json();
        if (list.length > 0) {
          setVersionId(list[0]!.id); // latest version comes first
        }
      } catch (err) {
        console.error("Failed to fetch versions", err);
      }
    })();
  }, [searchParams, projectId]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      config: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
    ) => {
      if (!project) return; // ensure project loaded
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      await sendMessage(
        {
          id: nanoid(),
          role: "user",
          type: "text",
          content,
        },
        {
          ...config,
          projectId: project.id,
          projectName: project.project_name,
          versionId: versionId,
          bucket: project.bucket_name ?? null,
        },
        { abortSignal: abortController.signal },
      );
      abortControllerRef.current = null;
    },
    [project, versionId],
  );

  useInitTeamMembers();
  useAutoScrollToBottom(scrollAreaRef, responding);

  // Redirect to create project if none exist
  const router = useRouter();
  useEffect(() => {
    const checkProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const list = (await res.json()) as unknown[];
          if (list.length === 0) {
            router.replace("/projects");
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkProjects();
  }, [router]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProject(data);
      })
      .catch(console.error);
  }, [projectId]);

  return (
    <TooltipProvider delayDuration={150}>
      {/* Overlay when sidebar open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <SideMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} project={project} />
      <ScrollArea className="h-screen w-full" ref={scrollAreaRef}>
        <div className="flex min-h-screen flex-col items-center">
          <header className="sticky top-0 right-0 left-0 z-10 flex h-16 w-full items-center px-4 backdrop-blur-sm">
            {/* Burger button */}
            <button
              className="mr-4 text-gray-700 hover:text-gray-900"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <AppHeader />
          </header>
          <main className="w-full flex-1 px-4 pb-48">
            <MessageHistoryView
              className="w-page mx-auto"
              messages={messages}
              loading={responding}
            />
          </main>
          <footer
            className={cn(
              "fixed bottom-4 transition-transform duration-500 ease-in-out",
              messages.length === 0
                ? "w-[640px] translate-y-[-34vh]"
                : "w-page",
            )}
          >
            {messages.length === 0 && (
              <div className="flex w-[640px] translate-y-[-32px] flex-col">
                <h3 className="mb-2 text-center text-3xl font-medium">
                  👋 Hello, there!
                </h3>
                <div className="px-4 text-center text-lg text-gray-400">
                  <a
                    href="https://github.com/krishna22112023/generative-ai-agentic-cv-frontend"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    AgenticVision
                  </a>
                  , built on cutting-edge language models, helps you build CV models from data to production
                </div>
              </div>
            )}
            <div className="flex flex-col overflow-hidden rounded-[24px] border bg-white shadow-lg">
              <InputBox
                size={messages.length === 0 ? "large" : "normal"}
                responding={responding}
                onSend={handleSendMessage}
                onCancel={() => {
                  abortControllerRef.current?.abort();
                  abortControllerRef.current = null;
                }}
              />
            </div>
            <div className="w-page absolute bottom-[-32px] h-8 backdrop-blur-xs" />
          </footer>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

export default function Home() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <ChatPage />
      </SignedIn>
    </>
  );
}
