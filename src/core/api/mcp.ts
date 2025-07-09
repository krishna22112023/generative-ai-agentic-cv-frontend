export interface McpConfig {
  [tool: string]: unknown;
}

export async function getMcpConfig(projectId: string): Promise<McpConfig> {
  const res = await fetch(`/api/projects/${projectId}/mcp`);
  if (!res.ok) throw new Error("Failed to fetch MCP config");
  return res.json();
}

export async function saveMcpConfig(projectId: string, config: McpConfig) {
  const res = await fetch(`/api/projects/${projectId}/mcp`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to save MCP config");
}

export async function deleteMcpTool(projectId: string, toolId: string) {
  const res = await fetch(`/api/projects/${projectId}/mcp?tool=${toolId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete MCP tool");
} 