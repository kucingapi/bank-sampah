import { Download } from "lucide-react";
import { Button } from "@/shared/ui/ui/button";

interface ExportCSVButtonProps {
  onExport: () => void;
  filename?: string;
  disabled?: boolean;
}

export function ExportCSVButton({
  onExport,
  filename = "export",
  disabled = false,
}: ExportCSVButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled}
      data-icon="inline-start"
    >
      <Download />
      Export {filename}
    </Button>
  );
}