"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { getMcpConfig, saveMcpConfig, deleteMcpTool } from "~/core/api/mcp";

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
    id: "github",
    name: "GitHub",
    description: "Sync repository data and issues.",
    authPath: "/api/mcp/auth/github",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Pull files and messages from channels.",
    authPath: "/api/mcp/auth/slack",
  },
] as const;

type ToolId = typeof TOOLS[number]["id"];

export function McpToolsDialog({ open, onClose, projectId }: Props) {
  const [configs, setConfigs] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

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
        <h3 className="mb-4 text-xl font-semibold">MCP Tools</h3>
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
                  <Button
                    variant="destructive"
                    onClick={() => disconnect(t.id)}
                  >
                    Disconnect
                  </Button>
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
      </div>
    </div>
  );
} 