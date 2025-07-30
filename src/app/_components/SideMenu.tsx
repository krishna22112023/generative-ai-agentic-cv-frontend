"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "~/core/utils";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    project_name: string;
    bucket_name?: string;
    description?: string;
  } | null;
  versionId: string | null;
}

export function SideMenu({ open, onClose, project, versionId }: SideMenuProps) {

  // Friendly name for current version (Version1, Version2, ...)
  const [friendlyVersion, setFriendlyVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!project || !versionId) {
      setFriendlyVersion(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/versions`);
        if (!res.ok) return;
        const list: { id: string }[] = await res.json();
        const index = list.findIndex((v) => v.id === versionId);
        if (index !== -1) {
          // Versions array might be newest first; display as Version{total-index}
          const versionNumber = list.length - index;
          setFriendlyVersion(`Version${versionNumber}`);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [project, versionId]);
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-30 h-full w-64 bg-gray-100 shadow-lg transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col items-center gap-4 p-4 pt-6">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        {/* Thumbnail */}
        <Image
          src="/thumbnail.png"
          alt="thumbnail"
          width={120}
          height={120}
          className="rounded-lg border object-cover"
        />
        {project && (
          <div className="text-center">
            <h2 className="text-lg font-semibold leading-tight">
              {project.project_name}
            </h2>
            {friendlyVersion && (
              <p className="text-xs font-medium text-gray-600 mt-0.5">
                {friendlyVersion}
              </p>
            )}
            {project.description && (
              <p className="text-xs text-gray-500 mt-1">
                {project.description}
              </p>
            )}
          </div>
        )}
      </div>
      <hr className="border-gray-300" />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">DATA</h3>
          <div className="flex items-center gap-2">
            {/* Back button */}
            <Link href="/projects" passHref legacyBehavior>
              <a className="rounded bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-black/80">Back</a>
            </Link>
            {/* New button */}
            {project && (
              <button
                className="rounded bg-black px-2 py-1 text-xs font-semibold text-white"
                onClick={async () => {
                  if (!project) return;
                  try {
                    const res = await fetch(`/api/projects/${project.id}/versions`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        trigger: "manual",
                        bucket_name: project.bucket_name ?? "",
                        path: `${project.project_name}/raw/`,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      window.location.href = `/?projectId=${project.id}&versionId=${data.id}`;
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                New
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {project ? (
            <Link
              href={{ pathname: `/projects/${project.id}/visualize`, query: { projectId: project.id } }}
              onClick={onClose}
              className="w-full rounded border px-3 py-2 text-center text-sm hover:bg-gray-200"
            >
              Visualize
            </Link>
          ) : (
            <span className="w-full rounded border px-3 py-2 text-center text-sm text-gray-400">Visualize</span>
          )}

          {project ? (
            <Link
              href={{ pathname: `/projects/${project.id}/versions`, query: { projectId: project.id } }}
              onClick={onClose}
              className="w-full rounded border px-3 py-2 text-center text-sm hover:bg-gray-200"
            >
              Versions
            </Link>
          ) : (
            <span className="w-full rounded border px-3 py-2 text-center text-sm text-gray-400">Versions</span>
          )}
          {project ? (
            <Link
              href={{ pathname: `/projects/${project.id}/analytics`, query: { projectId: project.id } }}
              onClick={onClose}
              className="w-full rounded border px-3 py-2 text-center text-sm hover:bg-gray-200"
            >
              Analytics
            </Link>
          ) : (
            <span className="w-full rounded border px-3 py-2 text-center text-sm text-gray-400">Analytics</span>
          )}
        </div>
      </div>
    </aside>
  );
} 