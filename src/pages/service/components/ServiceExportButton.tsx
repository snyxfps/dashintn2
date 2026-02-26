import type { ServiceRecord } from "@/types";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function toCsv(rows: ServiceRecord[]) {
  const headers = [
    "id",
    "client_name",
    "status",
    "owner",
    "start_date",
    "end_date",
    "cadastro_date",
    "meeting_datetime",
    "devolucao_date",
    "integration_type",
    "agidesk_ticket",
    "commercial",
    "notes",
    "created_at",
    "updated_at",
  ];

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
  ];

  return lines.join("\n");
}

export function ServiceExportButton({ rows, fileBaseName }: { rows: ServiceRecord[]; fileBaseName: string }) {
  const downloadCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" onClick={downloadCsv} className="h-9">
      <Download className="w-3.5 h-3.5 mr-1.5" />
      Exportar CSV
    </Button>
  );
}
