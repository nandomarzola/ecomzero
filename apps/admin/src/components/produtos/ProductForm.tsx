"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ImageUploader from "@/components/produtos/ImageUploader";
import VariantListEditor, {
  emptyVariant,
  type VariantFormRow,
} from "@/components/produtos/VariantListEditor";
import { createProductAction, updateProductAction } from "@/lib/actions/product";

export type ProductFormInitial = {
  nome: string;
  categoria: string;
  subtitulo: string;
  descricao: string;
  ativo: boolean;
  imagem: string;
  imagens: string[];
  linkMercadoLivre: string;
  linkTiktokShop: string;
  linkShein: string;
  variantes: VariantFormRow[];
};

type ProductFormProps =
  | { mode: "create"; productId?: undefined; initial?: undefined }
  | { mode: "edit"; productId: string; initial: ProductFormInitial };

const inputClass =
  "rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#A9EC17]/40";

function blankInitial(): ProductFormInitial {
  return {
    nome: "",
    categoria: "",
    subtitulo: "",
    descricao: "",
    ativo: true,
    imagem: "",
    imagens: [],
    linkMercadoLivre: "",
    linkTiktokShop: "",
    linkShein: "",
    variantes: [emptyVariant()],
  };
}

export default function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = props.mode === "edit" ? props.initial : blankInitial();
  const [nome, setNome] = useState(start.nome);
  const [categoria, setCategoria] = useState(start.categoria);
  const [subtitulo, setSubtitulo] = useState(start.subtitulo);
  const [descricao, setDescricao] = useState(start.descricao);
  const [ativo, setAtivo] = useState(start.ativo);
  const [cover, setCover] = useState<string[]>(start.imagem ? [start.imagem] : []);
  const [galeria, setGaleria] = useState<string[]>(start.imagens);
  const [linkMercadoLivre, setLinkMercadoLivre] = useState(start.linkMercadoLivre);
  const [linkTiktokShop, setLinkTiktokShop] = useState(start.linkTiktokShop);
  const [linkShein, setLinkShein] = useState(start.linkShein);
  const [variantes, setVariantes] = useState<VariantFormRow[]>(start.variantes);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      nome,
      categoria,
      subtitulo,
      descricao,
      ativo,
      imagem: cover[0] ?? "",
      imagens: galeria,
      linkMercadoLivre,
      linkTiktokShop,
      linkShein,
      variantes: variantes.map((v) => ({
        id: v.id,
        label: v.label,
        precoDe: v.precoDe,
        precoPor: v.precoPor,
        skuInterno: v.skuInterno,
        linkShopee: v.linkShopee,
        pesoKg: v.pesoKg,
        comprimentoCm: v.comprimentoCm,
        larguraCm: v.larguraCm,
        alturaCm: v.alturaCm,
      })),
    };

    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateProductAction(props.productId, payload)
          : await createProductAction(payload);

      if (result.ok) {
        router.push("/produtos");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#111111] p-4">
        <h2 className="text-sm font-semibold text-white">Dados básicos</h2>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Nome
          <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Categoria
          <input
            className={inputClass}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Subtítulo
          <input
            className={inputClass}
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Descrição
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 accent-[#B8E82E]"
          />
          Produto ativo (visível na loja)
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#111111] p-4">
        <h2 className="text-sm font-semibold text-white">Imagens</h2>
        <ImageUploader label="Imagem de capa" value={cover} onChange={setCover} max={1} />
        <ImageUploader label="Galeria (imagens adicionais)" value={galeria} onChange={setGaleria} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#111111] p-4">
        <h2 className="text-sm font-semibold text-white">Links de marketplace</h2>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Mercado Livre
          <input
            className={inputClass}
            value={linkMercadoLivre}
            onChange={(e) => setLinkMercadoLivre(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          TikTok Shop
          <input
            className={inputClass}
            value={linkTiktokShop}
            onChange={(e) => setLinkTiktokShop(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Shein
          <input
            className={inputClass}
            value={linkShein}
            onChange={(e) => setLinkShein(e.target.value)}
            placeholder="https://…"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#111111] p-4">
        <h2 className="text-sm font-semibold text-white">Variantes</h2>
        <VariantListEditor value={variantes} onChange={setVariantes} />
      </section>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-[#B8E82E] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {props.mode === "edit" ? "Salvar alterações" : "Criar produto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/produtos")}
          className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
