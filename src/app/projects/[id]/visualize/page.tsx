"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const Gallery = dynamic(() =>
  import("react-grid-gallery").then((m) => m.Gallery), { ssr: false }
);

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Button } from "~/components/ui/button";

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

  return (
    <div className="p-4">
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
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      <Gallery
        images={images}
        margin={4}
        rowHeight={220}
        onClick={(index) => setLightboxIndex(index)}
      />

      {lightboxIndex !== null && (
        <Lightbox
          open={lightboxIndex !== null}
          close={() => setLightboxIndex(null)}
          slides={images.map((img) => ({ src: img.src }))}
          index={lightboxIndex ?? 0}
        />
      )}
    </div>
  );
} 