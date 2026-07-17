/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

type Props = { value: string; width: number; height: number; onChange: (value: { url: string; width: number; height: number }) => void };

async function dimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BannerImageUploader({ value, width, height, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file?: File) {
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const size = await dimensions(file);
      if (size.width !== width || size.height !== height) throw new Error(`Imagem inválida: ${size.width} × ${size.height}px. Use exatamente ${width} × ${height}px.`);
      const data = new FormData(); data.append("file", file);
      const response = await fetch("/api/upload?scope=banners", { method: "POST", body: data });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Falha no upload.");
      onChange({ url: result.url, width: size.width, height: size.height });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha no upload."); }
    finally { setUploading(false); if (ref.current) ref.current.value = ""; }
  }
  return <div className="space-y-2"><span className="text-xs text-white/60">Imagem obrigatória — exatamente <strong className="text-[#A9EC17]">{width} × {height}px</strong></span>
    {value ? <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black"><img src={value} alt="Prévia" style={{ aspectRatio: `${width} / ${height}` }} className="w-full object-cover" /><button type="button" onClick={() => onChange({ url: "", width: 0, height: 0 })} className="absolute right-2 top-2 rounded-full bg-black/80 p-1.5"><X className="h-4 w-4" /></button></div> : <button type="button" onClick={() => ref.current?.click()} disabled={uploading} className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-[#090909] text-sm text-white/45 hover:border-[#A9EC17]/40 hover:text-white">{uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}{uploading ? "Enviando…" : "Selecionar imagem"}</button>}
    <input ref={ref} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0])} />{error ? <p className="text-xs text-red-400">{error}</p> : null}</div>;
}
