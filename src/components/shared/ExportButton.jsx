import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportCsv } from "@/lib/csv";

export default function ExportButton({ filename, rows, columns, label = "Export CSV" }) {
  return (
    <Button
      size="sm" variant="outline"
      className="h-8 text-xs border-graphite-border"
      onClick={() => exportCsv(filename, rows, columns)}
      disabled={!rows || !rows.length}
    >
      <Download className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}