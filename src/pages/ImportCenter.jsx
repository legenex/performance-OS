import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileUp, Check, AlertCircle } from "lucide-react";

const IMPORT_TYPES = [
  { value: 'leads', label: 'Leads', entity: 'Lead' },
  { value: 'bank_transactions', label: 'Bank Transactions', entity: 'BankTransaction' },
  { value: 'ad_spend', label: 'Ad Spend', entity: 'AdSpend' },
  { value: 'calls', label: 'Calls', entity: 'Call' },
  { value: 'invoices', label: 'Invoices', entity: 'ArInvoice' },
  { value: 'supplier_statements', label: 'Supplier Statements', entity: 'ApEntry' },
];

export default function ImportCenter() {
  const { toast } = useToast();
  const [importType, setImportType] = useState('leads');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const config = IMPORT_TYPES.find(t => t.value === importType);

      const schema = await base44.entities[config.entity].schema();
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: { type: "object", properties: schema.properties || {} }
            }
          }
        }
      });

      if (extracted.status === 'error') {
        setResult({ success: false, message: extracted.details });
        return;
      }

      let records = extracted.output?.records || extracted.output || [];
      if (!Array.isArray(records)) records = [records];

      // Flag test leads
      if (importType === 'leads') {
        records = records.map(r => ({
          ...r,
          is_test: r.is_test || /test@|Test Ignore|@test\.co\.za/i.test(JSON.stringify(r)),
          lead_key: r.lead_key || r.leadbyte_id || `hash_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        }));
      }

      // Cast money fields to numbers
      records = records.map(r => {
        const cleaned = { ...r };
        Object.keys(cleaned).forEach(k => {
          if (typeof cleaned[k] === 'string' && /^\$?[\d,]+\.?\d*$/.test(cleaned[k].trim())) {
            cleaned[k] = parseFloat(cleaned[k].replace(/[$,]/g, ''));
          }
        });
        return cleaned;
      });

      // Bulk create in batches
      const batchSize = 50;
      let created = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await base44.entities[config.entity].bulkCreate(batch);
        created += batch.length;
      }

      setResult({ success: true, message: `${created} records imported successfully` });
      toast({ title: `${created} ${config.label.toLowerCase()} imported` });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Import Center" subtitle="Import CSV/Excel files into the system" />

      <div className="max-w-xl">
        <div className="bg-graphite-panel border border-graphite-border rounded-lg p-6 space-y-4">
          <div>
            <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">Import Type</label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger className="bg-graphite-lighter border-graphite-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-graphite-panel border-graphite-border">
                {IMPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-foreground">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-graphite-muted uppercase tracking-wider mb-1.5 block">File</label>
            <div className="border-2 border-dashed border-graphite-border rounded-lg p-6 text-center hover:border-graphite-muted transition-colors">
              <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e => setFile(e.target.files[0])} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileUp className="w-8 h-8 text-graphite-muted mx-auto mb-2" />
                {file ? (
                  <p className="text-sm text-foreground">{file.name}</p>
                ) : (
                  <p className="text-sm text-graphite-muted">Click to select CSV, Excel, or JSON file</p>
                )}
              </label>
            </div>
          </div>

          <Button onClick={handleImport} disabled={!file || importing} className="w-full bg-brand-red hover:bg-brand-red/90 text-white">
            {importing ? (
              <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</div>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Import</>
            )}
          </Button>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {result.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}