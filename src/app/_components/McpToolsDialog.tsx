"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { getMcpConfig, deleteMcpTool } from "~/core/api/mcp";
import GoogleDrivePicker from "./GoogleDrivePicker";

declare global {
  interface Window { google: any }
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const TOOLS = [
  {
    id: "drive",
    name: "Google Drive",
    description: "Import folders from your Drive account.",
    authPath: "/api/mcp/auth/google",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Import folders from your OneDrive account.",
    authPath: "/api/mcp/auth/onedrive",
  },
] as const;

type ToolId = typeof TOOLS[number]["id"];

export function McpToolsDialog({ open, onClose, projectId }: Props) {
  const [configs, setConfigs] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [browseTool, setBrowseTool] = useState<ToolId | null>(null);
  const [pickerToken, setPickerToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMcpConfig(projectId)
      .then((cfg) => setConfigs(cfg))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const connected = (id: ToolId) => configs[id] !== undefined;

  const disconnect = async (id: ToolId) => {
    await deleteMcpTool(projectId, id);
    setConfigs((prev) => {
      const next = { ...prev } as Record<string, unknown>;
      delete next[id];
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-semibold">Connectors</h3>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded border p-4 shadow-sm"
              >
                <div>
                  <h4 className="font-medium">{t.name}</h4>
                  <p className="mb-4 text-xs text-gray-500">
                    {t.description}
                  </p>
                </div>
                {connected(t.id) ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (t.id === "drive") {
                          // fetch token
                          try {
                            const res = await fetch(`/api/mcp/drive/token?projectId=${projectId}`);
                            const j = await res.json();
                            if (res.ok) {
                              setPickerToken(j.access_token);
                              setBrowseTool("drive");
                            } else {
                              alert(j.error || "Failed to get token");
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        } else {
                          setBrowseTool(t.id);
                        }
                      }}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => disconnect(t.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      // redirect to backend auth route
                      window.location.href = `${t.authPath}?projectId=${projectId}`;
                    }}
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {browseTool === "drive" && pickerToken && (
          <GoogleDrivePicker
            accessToken={pickerToken}
            onPicked={async (data) => {
              try {
                const googleApi = window.google;
                const docsKey = googleApi?.picker?.Response?.DOCUMENTS ?? "docs";
                const docs = data[docsKey] ?? data?.docs ?? [];
                if (docs.length === 0) return;
                const folderId = docs[0]?.id;
                if (!folderId) return;
                const res = await fetch(`/api/mcp/drive/import`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId, folderId }),
                });
                const j = await res.json();
                if (res.ok) {
                  alert(`Imported ${j.imported} files from Drive folder.`);
                } else {
                  alert(j.error || "Import failed");
                }
              } catch (err) {
                console.error(err);
              }
            }}
            onClose={() => {
              setBrowseTool(null);
              setPickerToken(null);
            }}
          />
        )}
        {browseTool && browseTool !== "drive" && (
          <RemoteFilesDialog
            toolId={browseTool}
            projectId={projectId}
            onClose={() => setBrowseTool(null)}
          />
        )}
      </div>
    </div>
  );
}

interface RemoteFilesProps {
  toolId: ToolId;
  projectId: string;
  onClose: () => void;
}

function RemoteFilesDialog({ toolId, projectId, onClose }: RemoteFilesProps) {
  const [files, setFiles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/mcp/${toolId}/list?projectId=${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to list files");
        return res.json();
      })
      .then((data) => setFiles(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [toolId, projectId]);

  if (!toolId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-semibold">{toolId} files</h3>
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {files && (
          <ul className="mb-4 max-h-64 overflow-y-auto rounded border p-2 text-sm">
            {files.map((f: any) => (
              <li key={f.id || f.name}>{f.name}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 