"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "../_components/AppHeader";

interface Project {
  id: string;
  name: string;
  edited: Date;
  images: number;
  models: number;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 12 * month;

  let value: number;
  let unit: string;

  if (diff < minute) {
    value = Math.floor(diff / 1000);
    unit = "second";
  } else if (diff < hour) {
    value = Math.floor(diff / minute);
    unit = "minute";
  } else if (diff < day) {
    value = Math.floor(diff / hour);
    unit = "hour";
  } else if (diff < month) {
    value = Math.floor(diff / day);
    unit = "day";
  } else if (diff < year) {
    value = Math.floor(diff / month);
    unit = "month";
  } else {
    value = Math.floor(diff / year);
    unit = "year";
  }

  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  // load projects from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("projects");
    if (stored) {
      const parsed: Project[] = (JSON.parse(stored) as Project[]).map((p: Project) => ({
        ...p,
        edited: new Date(p.edited),
      }));
      setProjects(parsed);
    }
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", tags: "", description: "" });

  const addProject = () => {
    if (!form.name.trim()) return;
    setProjects([
      ...projects,
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        edited: new Date(),
        images: 0,
        models: 0,
      },
    ]);
    setForm({ name: "", tags: "", description: "" });
    setShowModal(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex w-full items-center px-4 py-2 backdrop-blur-sm">
        <AppHeader />
      </header>

      <main className="flex-1 px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">List of Projects</h1>
          <Button onClick={() => setShowModal(true)} className="bg-primary px-4 py-2">
            Create Project
          </Button>
        </div>

        {/* Projects grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {projects.map((proj) => (
            <Link
              key={proj.id}
              href="/"
              className="flex cursor-pointer gap-4 rounded-lg border p-4 shadow-sm hover:shadow-md"
            >
              <Image
                src="/thumbnail.png"
                alt="thumbnail"
                width={80}
                height={80}
                className="size-20 shrink-0 rounded object-cover"
              />
              <div className="flex flex-col">
                <h2 className="font-bold">{proj.name}</h2>
                <span className="text-sm text-gray-500">Edited {timeAgo(proj.edited)}</span>
                <span className="text-sm text-gray-500">
                  {proj.images} Images{proj.models ? ` • ${proj.models} Models` : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold">Let's create your project.</h3>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <label htmlFor="name" className="mb-1 text-sm font-medium">
                    Project Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="E.g., 'Dog Breeds' or 'Car Models' or 'Text Finder'"
                    className="rounded border px-3 py-2 text-sm placeholder-gray-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="tags" className="mb-1 text-sm font-medium">
                    Tags <span className="text-xs text-gray-400">(For multiple tags use semicolon)</span>
                  </label>
                  <input
                    id="tags"
                    type="text"
                    placeholder="vision;object-detection"
                    className="rounded border px-3 py-2 text-sm placeholder-gray-400"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
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
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button onClick={addProject}>Create Project</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
