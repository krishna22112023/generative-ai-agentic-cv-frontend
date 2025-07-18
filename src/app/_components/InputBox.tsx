import {
  ArrowUpOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/core/utils";
import { Upload as UploadIcon, Image as ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { McpToolsDialog } from "./McpToolsDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "~/components/ui/dropdown-menu";

export interface InputBoxHandle {
  setMessage: (msg: string) => void;
}

export const InputBox = forwardRef<InputBoxHandle, {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  onSend?: (
    message: string,
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  ) => void;
  onCancel?: () => void;
}>((
  {
    className,
    size,
    responding,
    onSend,
    onCancel,
  },
  ref,
) => {
  const [message, setMessage] = useState("");
  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageCount, setImageCount] = useState<number>(0);

  // Expose imperative handle to allow parent components to set the textarea content
  useImperativeHandle(ref, () => ({
    setMessage: (msg: string) => setMessage(msg),
  }));

  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  // Fetch image count whenever projectId changes
  useEffect(() => {
    if (!projectId) {
      setImageCount(0);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/minio/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, folder: "raw" }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = (data.items as { key: string }[]).filter((i) =>
          i.key.match(/\.(png|jpe?g|gif|bmp|webp)$/i),
        ).length;
        setImageCount(count);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [projectId]);

  const saveConfig = useCallback(() => {
    localStorage.setItem(
      "langmanus.config.inputbox",
      JSON.stringify({ deepThinkingMode, searchBeforePlanning }),
    );
  }, [deepThinkingMode, searchBeforePlanning]);

  const handleSendMessage = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "") {
        return;
      }
      if (onSend) {
        onSend(message, { deepThinkingMode, searchBeforePlanning });
        setMessage("");
      }
    }
  }, [
    responding,
    onCancel,
    message,
    onSend,
    deepThinkingMode,
    searchBeforePlanning,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (responding) {
        return;
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        imeStatus === "inactive"
      ) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [responding, imeStatus, handleSendMessage],
  );

  useEffect(() => {
    const config = localStorage.getItem("langmanus.config.inputbox");
    if (config) {
      const { deepThinkingMode, searchBeforePlanning } = JSON.parse(config);
      setDeepThinkMode(deepThinkingMode);
      setSearchBeforePlanning(searchBeforePlanning);
    }
  }, []);

  useEffect(() => {
    saveConfig();
  }, [deepThinkingMode, searchBeforePlanning, saveConfig]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const closeUpload = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
  };

  const startUpload = async () => {
    if (!projectId || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      selectedFiles.forEach((f) => fd.append("files", f));
      await fetch("/api/minio/upload", { method: "POST", body: fd });
      // TODO: could show a toast on success
      closeUpload();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn(className)}>
      {/* Active option tags */}
      {(deepThinkingMode || searchBeforePlanning) && (
        <div className="flex gap-2 px-4 pt-2">
          {deepThinkingMode && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
              Deep Think
            </span>
          )}
          {searchBeforePlanning && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
              Search
            </span>
          )}
        </div>
      )}

      <div className="w-full">
        <textarea
          className={cn(
            "m-0 w-full resize-none border-none px-4 py-3 text-lg",
            size === "large" ? "min-h-32" : "min-h-4",
          )}
          placeholder="What can I do for you?"
          value={message}
          onCompositionStart={() => setImeStatus("active")}
          onCompositionEnd={() => setImeStatus("inactive")}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
      </div>
      <div className="flex items-center px-4 py-2">
        <div className="flex grow items-center gap-2">
          {/* Upload / Connectors dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-2xl px-4 text-sm border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600"
                  >
                    <UploadIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Options</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => {
                  if (!projectId) {
                    alert("Please select a project first.");
                    return;
                  }
                  setShowUploadModal(true);
                }}
              >
                Upload files
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  if (!projectId) {
                    alert("Please select a project first.");
                    return;
                  }
                  setShowTools(true);
                }}
              >
                Connectors
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Images count button */}
          {projectId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-2xl px-4 text-sm"
                  onClick={() => {
                    // In future, could open gallery modal
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="ml-1">+{imageCount} Images</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Images in raw folder</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Tools dropdown (Deep Think & Search) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-2xl px-4 text-sm"
                  >
                    <SettingOutlined className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tools</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={deepThinkingMode}
                onCheckedChange={() => setDeepThinkMode((v) => !v)}
              >
                Deep Think
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={searchBeforePlanning}
                onCheckedChange={() => setSearchBeforePlanning((v) => !v)}
              >
                Search
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* END buttons group */}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full",
                  responding ? "bg-button-hover" : "bg-button",
                )}
                onClick={handleSendMessage}
              >
                {responding ? (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <div className="h-4 w-4 rounded-sm bg-red-300" />
                  </div>
                ) : (
                  <ArrowUpOutlined />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{responding ? "Stop" : "Send"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-semibold">Upload Files</h3>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="mb-4"
            />
            {selectedFiles.length > 0 && (
              <ul className="mb-4 max-h-40 overflow-y-auto rounded border p-2 text-sm">
                {selectedFiles.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={closeUpload} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={startUpload} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showTools && projectId && (
        <McpToolsDialog open={showTools} onClose={() => setShowTools(false)} projectId={projectId} />
      )}
    </div>
  );
});

InputBox.displayName = "InputBox";
