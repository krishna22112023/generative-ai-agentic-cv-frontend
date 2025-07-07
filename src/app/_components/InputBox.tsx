import {
  ArrowUpOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { type KeyboardEvent, useCallback, useEffect, useState, useRef } from "react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";
import { Upload as UploadIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function InputBox({
  className,
  size,
  responding,
  onSend,
  onCancel,
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  onSend?: (
    message: string,
    options: { deepThinkingMode: boolean; searchBeforePlanning: boolean },
  ) => void;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [deepThinkingMode, setDeepThinkMode] = useState(false);
  const [searchBeforePlanning, setSearchBeforePlanning] = useState(false);
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl px-4 text-sm border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600"
                onClick={() => {
                  if (!projectId) {
                    alert("Please select a project first.");
                    return;
                  }
                  setShowUploadModal(true);
                }}
              >
                <UploadIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload files/folders</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn("rounded-2xl px-4 text-sm", {
                  "border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600":
                    deepThinkingMode,
                })}
                onClick={() => {
                  setDeepThinkMode(!deepThinkingMode);
                }}
              >
                <Atom className="h-4 w-4" />
                <span>Deep Think</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Deep thinking mode. Think before planning.
                <br />
                <br />
                <span className="text-xs text-gray-300">
                  This feature may cost more tokens and time.
                </span>
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn("rounded-2xl px-4 text-sm", {
                  "border-blue-300 bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-600":
                    searchBeforePlanning,
                })}
                onClick={() => {
                  setSearchBeforePlanning(!searchBeforePlanning);
                }}
              >
                <GlobalOutlined className="h-4 w-4" />
                <span>Search</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search before planning</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                disabled
                className="rounded-2xl px-4 text-sm cursor-default border-green-300 bg-green-100 text-green-600"
              >
                <span className="mr-2 size-2 rounded-full bg-green-600" />
                minio
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connected data source</p>
            </TooltipContent>
          </Tooltip>
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
    </div>
  );
}
