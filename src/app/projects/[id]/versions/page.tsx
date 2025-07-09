"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { AppHeader } from "../../../_components/AppHeader";

interface Version {
  id: string;
  trigger: "upload" | "manual";
  created_at: string;
}

export default function VersionsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const router = useRouter();
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex w-full items-center px-4 py-2 backdrop-blur-sm">
        <AppHeader />
      </header>
      <main className="flex-1 px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dataset Versions</h1>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {versions.map((v) => (
            <Link
              key={v.id}
              href={{ pathname: "/", query: { projectId, versionId: v.id } }}
              className="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 shadow-sm hover:shadow-md"
            >
              <h2 className="font-bold">{v.id.slice(0, 8)}</h2>
              <span className="text-sm text-gray-500 capitalize">{v.trigger}</span>
              <span className="text-sm text-gray-500">{timeAgo(new Date(v.created_at))}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
} 