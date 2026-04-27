import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "error";

export interface UpdateInfo {
  version: string;
  body?: string;
  date?: string;
}

interface UseUpdaterReturn {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export function useUpdater(): UseUpdaterReturn {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);

  const checkForUpdate = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setDownloadProgress(0);

    try {
      const update = await check({
        headers: { "Accept": "application/json" },
      });

      if (!update) {
        setStatus("up-to-date");
        setUpdateInfo(null);
        toast.success("You're up to date!");
        return;
      }

      updateRef.current = update;
      setUpdateInfo({
        version: update.version,
        body: update.body ?? undefined,
        date: update.date ?? undefined,
      });
      setStatus("available");
    } catch (err: any) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("[updater] check failed:", err);
      setError(message);
      setStatus("error");
      toast.error("Failed to check for updates", { description: message });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateRef.current) {
      toast.error("No update available");
      return;
    }

    setStatus("downloading");
    setError(null);

    try {
      await updateRef.current.downloadAndInstall((event: any) => {
        if (event.event === "Started") {
          setDownloadProgress(0);
        } else if (event.event === "Progress") {
          if (event.data.contentLength && event.data.chunkLength) {
            const progress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
            setDownloadProgress(Math.min(progress, 100));
          }
        } else if (event.event === "Finished") {
          setDownloadProgress(100);
        }
      });

      setStatus("ready");
      toast.success("Update installed! Restarting...");

      // Give the toast a moment to show before restarting
      setTimeout(async () => {
        await relaunch();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to install update";
      setError(message);
      setStatus("error");
      toast.error("Failed to install update", { description: message });
    }
  }, []);

  // Check for updates on app startup (once per session)
  // Skip in dev mode — updater only works in production builds
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (!isDev) {
      checkForUpdate();
    }
  }, [checkForUpdate]);

  return {
    status,
    updateInfo,
    downloadProgress,
    error,
    checkForUpdate,
    installUpdate,
  };
}
