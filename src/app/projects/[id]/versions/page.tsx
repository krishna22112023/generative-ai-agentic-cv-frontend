"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "../../../_components/AppHeader";
import { SideMenu } from "../../../_components/SideMenu";
import { Menu as MenuIcon } from "lucide-react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { ScrollArea } from "~/components/ui/scroll-area";

interface Version {
  id: string;
  trigger: "upload" | "manual";
  created_at: string;
}

export default function VersionsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<{ id: string; project_name: string; bucket_name?: string; description?: string } | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/versions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setVersions(data))
      .catch(console.error);
  }, [projectId]);

  const timeAgo = (date: Date) => {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!projectId) {
    return <div className="p-4">Project not specified</div>;
  }

  // fetch project details for side menu
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProject(data))
      .catch(console.error);
  }, [projectId]);

  return (
    <TooltipProvider delayDuration={150}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <SideMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} project={project} versionId={null} />
      <ScrollArea className="h-screen w-full">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-16 w-full items-center px-4 backdrop-blur-sm">
            <button className="mr-4 text-gray-700 hover:text-gray-900" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon className="h-6 w-6" />
            </button>
            <AppHeader />
          </header>
          <main className="flex-1 px-8 py-6">
            <h1 className="mb-6 text-2xl font-semibold">Dataset Versions</h1>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {versions.map((v, idx) => (
                <a
                  key={v.id}
                  href={`/?projectId=${projectId}&versionId=${v.id}`}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 shadow-sm hover:shadow-md"
                >
                  <h2 className="font-bold">{`Version${idx + 1}`}</h2>
                  <span className="text-sm text-gray-500 capitalize">{v.trigger}</span>
                  <span className="text-sm text-gray-500">{timeAgo(new Date(v.created_at))}</span>
                </a>
              ))}
            </div>
          </main>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
} 