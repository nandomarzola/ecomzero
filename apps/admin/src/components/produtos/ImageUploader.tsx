"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, X } from "lucide-react";

type ImageUploaderProps = {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  scope?: "produtos" | "categorias";
  sortable?: boolean;
};

type SortableImageProps = {
  index: number;
  url: string;
  onPreview: () => void;
  onRemove: () => void;
};

function SortableImage({ index, url, onPreview, onRemove }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative h-20 w-20 overflow-hidden rounded-lg border bg-[#111111] ${
        isDragging ? "border-[#A9EC17]/70 opacity-70 shadow-lg" : "border-white/10"
      }`}
    >
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Pré-visualizar imagem ${index + 1}`}
        className="block h-full w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover imagem ${index + 1}`}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white/80 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded bg-black/75 px-1 text-[10px] font-semibold text-white">
        {index + 1}
      </span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Mover imagem ${index + 1}`}
        title="Arraste para alterar a ordem"
        className="absolute bottom-1 right-1 flex h-6 w-6 touch-none cursor-grab items-center justify-center rounded bg-black/75 text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

// Sobe cada arquivo para /api/upload (Vercel Blob) e guarda as URLs. Usa <img>
// puro (não next/image) de propósito — é painel interno e evita configurar
// remotePatterns aqui.
export default function ImageUploader({
  label,
  value,
  onChange,
  max,
  scope = "produtos",
  sortable = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const atMax = max !== undefined && value.length >= max;

  useEffect(() => {
    if (!previewUrl) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewUrl(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewUrl]);

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
        const res = await fetch(`/api/upload?scope=${scope}`, { method: "POST", body: fd });
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previousIndex = value.indexOf(String(active.id));
    const nextIndex = value.indexOf(String(over.id));
    if (previousIndex === -1 || nextIndex === -1) return;

    onChange(arrayMove(value, previousIndex, nextIndex));
  }

  const addButton = !atMax ? (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-white/50 transition hover:border-[#A9EC17]/40 hover:text-white disabled:opacity-50"
    >
      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
      <span className="text-[10px]">{uploading ? "Enviando" : "Adicionar"}</span>
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-white/60">{label}</span>

      {sortable && value.length > 1 ? (
        <span className="text-[11px] text-white/40">Arraste pelo ícone para definir a ordem das imagens.</span>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={value} strategy={rectSortingStrategy}>
              {value.map((url, index) => (
                <SortableImage
                  key={url}
                  index={index}
                  url={url}
                  onPreview={() => setPreviewUrl(url)}
                  onRemove={() => onChange(value.filter((_, imageIndex) => imageIndex !== index))}
                />
              ))}
            </SortableContext>
            {addButton}
          </DndContext>
        ) : (
          <>
            {value.map((url, index) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(url)}
                  aria-label={`Pré-visualizar imagem ${index + 1}`}
                  className="block h-full w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, imageIndex) => imageIndex !== index))}
                  aria-label="Remover imagem"
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white/80 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {addButton}
          </>
        )}
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

      {previewUrl ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            aria-label="Fechar pré-visualização"
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Pré-visualização da imagem"
            className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/70"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">Pré-visualização</span>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                aria-label="Fechar pré-visualização"
                className="rounded-md p-1.5 text-white/50 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black/40 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pré-visualização ampliada"
                className="max-h-[calc(100vh-8rem)] max-w-full rounded-lg object-contain"
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
