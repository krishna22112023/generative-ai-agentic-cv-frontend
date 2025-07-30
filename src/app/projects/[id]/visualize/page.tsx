"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SideMenu } from "../../../_components/SideMenu";
import { AppHeader } from "../../../_components/AppHeader";
import { Menu as MenuIcon } from "lucide-react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { ScrollArea } from "~/components/ui/scroll-area";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

interface ImageItem {
  src: string;
  width: number;
  height: number;
}

export default function VisualizePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [folder, setFolder] = useState<"raw" | "processed" | "annotated">("raw");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<{ id: string; project_name: string; bucket_name?: string; description?: string } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await fetch("/api/minio/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, folder }),
        });
        const data = await res.json();
        const items: ImageItem[] = (data.items || []).map((it: any) => ({
          src: it.url,
          width: 1,
          height: 1,
        }));
        setImages(items);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [projectId, folder]);

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
          <main className="flex-1 px-4 py-6">
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm font-semibold">Folder:</label>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={folder}
                onChange={(e) => setFolder(e.target.value as any)}
              >
                <option value="raw">raw</option>
                <option value="processed">processed</option>
                <option value="annotated">annotated</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.src}
                  alt={`img-${idx}`}
                  className="h-48 w-full cursor-pointer object-cover"
                  onClick={() => setLightboxIndex(idx)}
                />
              ))}
            </div>

            {lightboxIndex !== null && (
              <Lightbox
                open={lightboxIndex !== null}
                close={() => setLightboxIndex(null)}
                slides={images.map((img) => ({ src: img.src }))}
                index={lightboxIndex ?? 0}
              />
            )}
          </main>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
} 