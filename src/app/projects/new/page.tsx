"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

interface Project {
  id: string;
  name: string;
  tags: string;
  description: string;
  edited: Date;
  images: number;
  models: number;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", tags: "", description: "" });

  // If projects already exist, redirect to home
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("projects");
    if (stored && JSON.parse(stored).length > 0) {
      router.replace("/");
    }
  }, [router]);

  const saveProject = () => {
    if (!form.name.trim()) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      tags: form.tags.trim(),
      description: form.description.trim(),
      edited: new Date(),
      images: 0,
      models: 0,
    };
    const stored = localStorage.getItem("projects");
    const list: Project[] = stored ? JSON.parse(stored) : [];
    list.push(newProject);
    localStorage.setItem("projects", JSON.stringify(list));
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-xl rounded-lg border p-6 shadow-lg">
        <h2 className="mb-6 text-2xl font-semibold">Let's create your project.</h2>
        <div className="mb-4">
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Project Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="E.g., 'Dog Breeds' or 'Car Models' or 'Text Finder'"
            className="w-full rounded border px-3 py-2 text-sm placeholder-gray-400"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="tags" className="mb-1 block text-sm font-medium">
            Tags <span className="text-xs text-gray-400">(For multiple tags use semicolon)</span>
          </label>
          <input
            id="tags"
            type="text"
            placeholder="vision;object-detection"
            className="w-full rounded border px-3 py-2 text-sm placeholder-gray-400"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="desc" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <input
            id="desc"
            type="text"
            placeholder="E.g., 'dogs' or 'cars' or 'words'"
            className="w-full rounded border px-3 py-2 text-sm placeholder-gray-400"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => router.replace("/")}>Cancel</Button>
          <Button onClick={saveProject}>Create Project</Button>
        </div>
      </div>
    </div>
  );
} 