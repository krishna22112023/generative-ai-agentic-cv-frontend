"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "../_components/AppHeader";
import { Upload, Pencil } from "lucide-react";
import { McpToolsDialog } from "../_components/McpToolsDialog";

interface Project {
  id: string;
  project_name: string;
  tags: string[];
  number_of_files: number | null;
  extensions: string[] | null;
  fps: number | null;
  bucket_name: string;
  created_at: string; // ISO string
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

  // load projects from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data: Project[] = await res.json();
          setProjects(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tags: "",
    description: "",
    endpointURL: "",
    useSSL: true,
    accessKey: "",
    secretKey: "",
    bucket: "",
  });

  const [buckets, setBuckets] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [showTools, setShowTools] = useState(false);

  // Editing / upload state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProject, setUploadProject] = useState<Project | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const closeUpload = () => {
    setShowUploadModal(false);
    setUploadProject(null);
    setSelectedFiles([]);
  };

  const startUpload = async () => {
    if (!uploadProject || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("projectId", uploadProject.id);
      selectedFiles.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/minio/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        // update projects list locally
        setProjects((prev) => prev.map((p) => p.id === uploadProject.id ? { ...p, number_of_files: (p.number_of_files ?? 0) + data.uploaded } : p));
        closeUpload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const saveProject = async () => {
    if (!form.name.trim()) return;
    if (!verified || !form.bucket) return;

    const payload = {
      project_name: form.name.trim(),
      tags: form.tags.split(";").map((t) => t.trim()).filter(Boolean),
      number_of_files: 0,
      extensions: [],
      fps: null,
      object_storage: "minio" as const,
      MINIO_ACCESS_KEY: form.accessKey,
      MINIO_SECRET_KEY: form.secretKey,
      MINIO_ENDPOINT_URL: form.endpointURL,
      bucket_name: form.bucket,
    };

    try {
      let res: Response;
      let project: Project;
      if (editingProject) {
        // update
        res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          project = (await res.json()) as Project;
          setProjects(projects.map((p) => (p.id === project.id ? project : p)));
        }
      } else {
        // create
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          project = (await res.json()) as Project;
          setProjects([...projects, project]);
          // create prefix in bucket asynchronously
          fetch("/api/minio/create-prefix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: project.id }),
          }).catch(console.error);
        }
      }
      setShowModal(false);
      setEditingProject(null);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyStorage = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/minio/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointURL: form.endpointURL,
          useSSL: form.useSSL,
          accessKey: form.accessKey,
          secretKey: form.secretKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBuckets(data.buckets as string[]);
        setVerified(true);
      } else {
        setVerifyError(data.error ?? "Verification failed");
        setVerified(false);
      }
    } catch (e) {
      setVerifyError(String(e));
      setVerified(false);
    } finally {
      setVerifying(false);
    }
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
              href={{ pathname: "/", query: { projectId: proj.id } }}
              className="flex cursor-pointer gap-4 rounded-lg border p-4 shadow-sm hover:shadow-md"
              onClick={() => {
                fetch("/api/active-project", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId: proj.id }),
                }).catch(console.error);
              }}
            >
              <Image
                src="/thumbnail.png"
                alt="thumbnail"
                width={80}
                height={80}
                className="size-20 shrink-0 rounded object-cover"
              />
              <div className="relative flex flex-col">
                <div className="absolute bottom-0 right-0 flex gap-1">
                  <button
                    className="rounded bg-white p-1 shadow hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingProject(proj);
                      setForm({
                        name: proj.project_name,
                        tags: proj.tags.join(";"),
                        description: "",
                        endpointURL: "",
                        useSSL: true,
                        accessKey: "",
                        secretKey: "",
                        bucket: proj.bucket_name,
                      });
                      setVerified(true);
                      setShowModal(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded bg-white p-1 shadow hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setUploadProject(proj);
                      setShowUploadModal(true);
                    }}
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col">
                  <h2 className="font-bold">{proj.project_name}</h2>
                  <span className="text-sm text-gray-500">Edited {timeAgo(new Date(proj.created_at))}</span>
                  <span className="text-sm text-gray-500">
                    {proj.number_of_files} Files{proj.fps ? ` • ${proj.fps} FPS` : ""}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm">
                    <span
                      className={`size-2 rounded-full ${proj.bucket_name ? "bg-green-500" : "bg-red-500"}`}
                    />
                    {proj.bucket_name ? "connected" : "disconnected"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold">{editingProject ? "Manage project" : "Let's create your project."}</h3>
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
              {/* Storage Config */}
              <div className="mb-6 border-t pt-4">
                <h4 className="mb-4 text-lg font-medium">Storage Configuration</h4>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium">Endpoint URL</label>
                    <input
                      type="text"
                      placeholder="https://play.min.io:9000"
                      className="rounded border px-3 py-2 text-sm placeholder-gray-400"
                      value={form.endpointURL}
                      onChange={(e) => setForm({ ...form, endpointURL: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="ssl"
                      type="checkbox"
                      checked={form.useSSL}
                      onChange={(e) => setForm({ ...form, useSSL: e.target.checked })}
                    />
                    <label htmlFor="ssl" className="text-sm">Use SSL</label>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium">Access Key</label>
                    <input
                      type="password"
                      placeholder="Access Key"
                      className="rounded border px-3 py-2 text-sm placeholder-gray-400"
                      value={form.accessKey}
                      onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium">Secret Key</label>
                    <input
                      type="password"
                      placeholder="Secret Key"
                      className="rounded border px-3 py-2 text-sm placeholder-gray-400"
                      value={form.secretKey}
                      onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <Button size="sm" onClick={verifyStorage} disabled={verifying}>
                    {verifying ? "Verifying..." : "Verify"}
                  </Button>
                  {verifyError && <span className="text-sm text-red-500">{verifyError}</span>}
                </div>
                {buckets.length > 0 && (
                  <div className="mb-4 flex flex-col">
                    <label className="mb-1 text-sm font-medium">Bucket</label>
                    <select
                      className="rounded border px-3 py-2 text-sm"
                      value={form.bucket}
                      onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                    >
                      <option value="">Select bucket...</option>
                      {buckets.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {/* Tools Config */}
              {verified && (
                <div className="mb-4 flex justify-end">
                  <Button variant="outline" onClick={() => setShowTools(true)}>
                    Configure Tools
                  </Button>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button onClick={saveProject} disabled={!verified || !form.bucket}>
                  {editingProject ? "Save" : "Create Project"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showUploadModal && uploadProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold">Upload to {uploadProject.project_name}</h3>
              <input type="file" multiple onChange={handleFileSelect} className="mb-4" />
              {selectedFiles.length > 0 && (
                <ul className="mb-4 max-h-40 overflow-y-auto rounded border p-2 text-sm">
                  {selectedFiles.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={closeUpload}>Cancel</Button>
                <Button onClick={startUpload} disabled={uploading || selectedFiles.length === 0}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {showTools && editingProject && (
          <McpToolsDialog open={showTools} onClose={() => setShowTools(false)} projectId={editingProject.id} />
        )}
      </main>
    </div>
  );
}
