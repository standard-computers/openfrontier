import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { normalizeTaxRate } from '@/lib/citizenEconomy';

export default function TaxRateControl({ label, rate, onSave }: { label: string; rate?: number; onSave: (rate: number) => void }) {
  const [draft, setDraft] = useState(String(normalizeTaxRate(rate)));
  useEffect(() => setDraft(String(normalizeTaxRate(rate))), [rate]);
  const value = Number(draft);
  const valid = draft.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100;
  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (valid) onSave(value); }}>
      <label className="text-sm font-medium flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="flex items-center gap-2 shrink-0">
          <Input aria-label={label} type="text" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} className="w-20 h-8" aria-invalid={!valid} />
          <span>%</span>
          <Button type="submit" variant="outline" size="icon" className="h-8 w-8" disabled={!valid || value === normalizeTaxRate(rate)} title="Save tax rate" aria-label={`Save ${label.toLowerCase()}`}><Check className="h-4 w-4" /></Button>
        </span>
      </label>
      {valid && value >= 50 && <p className="text-xs text-destructive">High tax burden · citizens may leave</p>}
    </form>
  );
}