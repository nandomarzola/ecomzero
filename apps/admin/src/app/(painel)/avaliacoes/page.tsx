import { CheckCircle2, Clock3, MessageSquareText, Star, XCircle } from "lucide-react";
import ReviewModerationList from "@/components/avaliacoes/ReviewModerationList";
import OrderSummaryCard from "@/components/pedidos/OrderSummaryCard";
import { listProductReviews } from "@/lib/services/reviewAdminService";

export const dynamic = "force-dynamic";

export default async function AvaliacoesPage() {
  const reviews = await listProductReviews();
  const pending = reviews.filter((review) => review.status === "pending").length;
  const approved = reviews.filter((review) => review.status === "approved").length;
  const removed = reviews.filter((review) => review.status === "rejected").length;
  const average = approved
    ? reviews
        .filter((review) => review.status === "approved")
        .reduce((sum, review) => sum + review.rating, 0) / approved
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Avaliações</h1>
        <p className="mt-1 text-sm text-white/45">As avaliações são publicadas automaticamente. Remova apenas conteúdos falsos ou que violem as regras da loja.</p>
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrderSummaryCard label="Pendentes" value={String(pending)} subtitle="Aguardam moderação" icon={Clock3} tone="amber" active={pending > 0} />
        <OrderSummaryCard label="Aprovadas" value={String(approved)} subtitle="Publicadas na loja" icon={CheckCircle2} tone="green" />
        <OrderSummaryCard label="Removidas" value={String(removed)} subtitle="Fora da loja e da média" icon={XCircle} tone="purple" />
        <OrderSummaryCard label="Nota média" value={average ? average.toFixed(1).replace(".", ",") : "—"} subtitle="Avaliações aprovadas" icon={Star} tone="blue" />
      </section>
      {reviews.length === 0 ? <div className="sr-only"><MessageSquareText />Nenhuma avaliação</div> : null}
      <ReviewModerationList reviews={reviews} />
    </div>
  );
}
