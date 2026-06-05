'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  onUploaded: (evidenceUrl: string) => void;
  onClear: () => void;
  uploadedFilename?: string;
}

export function FileUploadZone({ onUploaded, onClear, uploadedFilename }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    setError(null);
    if (!files || files.length === 0) return;
    const file = files[0];
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/evidence', { method: 'POST', body: formData, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onUploaded(json.evidenceUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  if (uploadedFilename) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/30">
        <span className="text-brand-800 dark:text-brand-200">✓ Evidence attached</span>
        <button type="button" onClick={onClear} className="text-xs text-ink-500 hover:text-ink-700 focus-ring dark:text-ink-400 dark:hover:text-ink-200">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver
            ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
            : 'border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-900/40',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-sm font-medium text-ink-700 dark:text-ink-200">Drop a PDF or image as evidence</div>
        <div className="text-xs text-ink-500 dark:text-ink-400">PDF, PNG, JPEG — up to 10 MiB. Optional.</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : 'Choose file'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
