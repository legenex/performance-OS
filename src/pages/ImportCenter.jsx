import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileUp, Check, AlertCircle, Eye } from "lucide-react";

const IMPORT_TYPES = [
  { value: 'leads', label: 'Leads', entity: 'Lead' },
  { value: 'bank_transactions', label: 'Bank Transactions', entity: 'BankTransaction' },
  { value: 'ad_spend', label: 'Ad Spend', entity: 'AdSpend' },
  { value: 'calls', label: 'Calls', entity: 'Call' },
  { value: 'invoices', label: 'Invoices', entity: 'ArInvoice' },
  { value: 'leadbyte_parity', label: 'LeadByte Parity', entity: 'ExternalParityRow' },
  { value: 'supplier_statements', label: 'Supplier Statements', entity: 'ApEntry' },
];

function coerceRecords(records, importType) {
  let out = records;
  if (importType === 'leads') {
    out = out.map(r => ({
      ...r,
      is_test: r.is_test || /test@|Test Ignore|@test\.co\.za/i.test(JSON.stringify(r)),
      lead_key: r.lead_key || r.leadbyte_id || `hash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }));
  }
  return out.map(r => {
    const cleaned = { ...r };
    Object.keys(cleaned).forEach(k => {
      if (typeof cleaned[k] === 'string' && /^\$?[\d,]+\.?\d*$/.test(cleaned[k].trim())) {
        cleaned[k] = parseFloat(cleaned[k].replace(/[$,]/g, ''));
      }
    });
    return cleaned;
  });
}

export default function ImportCenter() {
  const { toast } = useToast();
  const [importType, setImportType] = useState('leads');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { records, columns }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const config = IMPORT_TYPES.find(t => t.value === importType);

  function reset() { setPreview(null); setResult(null); }

  // Step 1: extract & show mapping preview (no commit)
  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setPreview(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const schema = await base44.entities[config.entity].schema();
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: { records: { type: "array", items: { type: "object", properties: schema.properties || {} } } },
        },
      });
      if (extracted.status === 'error') { setResult({ success: false, message: extracted.details }); return; }

      let records = extracted.output?.records || extracted.output || [];
      if (!Array.isArray(records)) records = [records];
      records = coerceRecords(records, importType);

      const columns = Object.keys(schema.properties || {}).filter(c => records.some(r => r[c] !== undefined && r[c] !== null && r[c] !== ''));
      setPreview({ records, columns });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setBusy(false);
    }
  }

  // Step 2: commit the previewed records
  async function handleCommit() {
    if (!preview) return;
    setBusy(true);
    try {
      const batchSize = 50;
      let created = 0;
      for (let i = 0; i < preview.records.length; i += batchSize) {
        await base44.entities[config.entity].bulkCreate(preview.records.slice(i, i + batchSize));
        created += preview.records.slice(i, i + batchSize).length;
      }
      setResult({ success: true, message: `${created} records imported successfully` });
      toast({ title: `${created} ${config.label.toLowerCase()} imported` });
      setPreview(null);
      setFile(null);
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Import Center" subtitle="Import CSV/Excel files — preview the mapping before committing" />

      <div className="max-w-4xl">
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6 space-y-4">
          <div>
            <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">Import Type</label>
            <Select value={importType} onValueChange={(v) => { setImportType(v); reset(); }}>
              <SelectTrigger className="bg-graphite-lighter border-graphite-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-graphite-panel border-graphite-border">
                {IMPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-foreground">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">File</label>
            <div className="border-2 border-dashed border-graphite-border rounded-lg p-6 text-center hover:border-graphite-muted transition-colors">
              <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e => { setFile(e.target.files[0]); reset(); }} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileUp className="w-8 h-8 text-graphite-muted mx-auto mb-2" />
                {file ? <p className="text-sm text-foreground">{file.name}</p> : <p className="text-sm text-graphite-muted">Click to select CSV, Excel, or JSON file</p>}
              </label>
            </div>
          </div>

          {!preview && (
            <Button onClick={handlePreview} disabled={!file || busy} className="w-full bg-graphite-lighter hover:bg-graphite-border text-foreground border border-graphite-border">
              {busy ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Reading…</div> : <><Eye className="w-4 h-4 mr-2" /> Preview mapping</>}
            </Button>
          )}

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {result.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        {preview && (
          <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Mapping preview</div>
                <div className="text-xs text-graphite-muted">{preview.records.length} rows → <span className="font-mono">{config.entity}</span>. Showing first 10.</div>
              </div>
            </div>

            <div className="overflow-x-auto border border-graphite-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-graphite-border bg-graphite-lighter">
                    {preview.columns.map(c => <th key={c} className="text-left px-3 py-2 font-mono text-graphite-muted whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.records.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b border-graphite-border/50">
                      {preview.columns.map(c => <td key={c} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate">{String(r[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy}>Back</Button>
              <Button onClick={handleCommit} disabled={busy} className="flex-1 bg-brand-red hover:bg-brand-red/90 text-white">
                {busy ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</div> : <><Upload className="w-4 h-4 mr-2" /> Commit {preview.records.length} rows</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}