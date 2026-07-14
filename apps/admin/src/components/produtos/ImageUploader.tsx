"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

type ImageUploaderProps = {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
};

// Sobe cada arquivo para /api/upload (Vercel Blob) e guarda as URLs. Usa <img>
// puro (não next/image) de propósito — é painel interno e evita configurar
// remotePatterns aqui.
export default function ImageUploader({ label, value, onChange, max }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atMax = max !== undefined && value.length >= max;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (max !== undefined && value.length + uploaded.length >= max) break;
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Falha no upload");
        uploaded.push(data.url);
      }
      const next = [...value, ...uploaded];
      onChange(max !== undefined ? next.slice(0, max) : next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-white/60">{label}</span>

      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label="Remover imagem"
              className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white/80 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {!atMax ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-white/50 transition hover:border-[#A9EC17]/40 hover:text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px]">{uploading ? "Enviando" : "Adicionar"}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max === undefined || max > 1}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
