import { RefreshCw, Download, CheckCircle, AlertCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";
import { Progress } from "@/shared/ui/ui/progress";
import { useUpdater } from "../lib/use-updater";

interface CheckForUpdateProps {
  className?: string;
}

export function CheckForUpdate({ className }: CheckForUpdateProps) {
  const { status, updateInfo, downloadProgress, error, checkForUpdate, installUpdate } = useUpdater();

  if (status === "idle" || status === "checking") {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 rounded-lg border border-border/20 bg-card p-4">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Checking for updates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "up-to-date") {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 rounded-lg border border-border/20 bg-card p-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">You're up to date</p>
            <p className="text-xs text-muted-foreground">No updates available</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "available") {
    return (
      <div className={className}>
        <div className="rounded-lg border border-primary/20 bg-card p-4">
          <div className="flex items-start gap-3">
            <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">New version available</p>
                <p className="text-xs text-muted-foreground">Version {updateInfo?.version}</p>
              </div>
              {updateInfo?.body && (
                <div className="rounded-md bg-muted p-2">
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {updateInfo.body.slice(0, 300)}
                    {updateInfo.body.length > 300 ? "..." : ""}
                  </p>
                </div>
              )}
              <Button onClick={installUpdate} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download & Install
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "downloading") {
    return (
      <div className={className}>
        <div className="rounded-lg border border-border/20 bg-card p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 animate-pulse text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Downloading update...</p>
                <p className="text-xs text-muted-foreground">{downloadProgress}% complete</p>
              </div>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-card p-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Update installed!</p>
            <p className="text-xs text-muted-foreground">Restarting the app...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={className}>
        <div className="rounded-lg border border-destructive/20 bg-card p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Update check failed</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button onClick={checkForUpdate} size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
