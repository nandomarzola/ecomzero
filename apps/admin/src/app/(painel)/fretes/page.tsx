import { Box, ExternalLink, KeyRound, MapPin, TriangleAlert, WalletCards } from "lucide-react";
import { headers } from "next/headers";
import ShippingSettingsForm from "@/components/fretes/ShippingSettingsForm";
import { getMelhorEnvioBalance } from "@/lib/services/melhorEnvioAdminService";
import { getShippingIntegrationStatus } from "@/lib/services/shippingAdminService";
import { getShippingSettings } from "@/lib/services/shippingFulfillmentAdminService";

export const dynamic = "force-dynamic";

const oauthMessages: Record<string, { tone: string; text: string }> = {
  success: {
    tone: "border-[#A9EC17]/25 bg-[#A9EC17]/10 text-[#D9FF87]",
    text: "Integração reautorizada com as permissões de etiqueta e rastreio.",
  },
  config: {
    tone: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    text: "Configure Client ID e Client Secret no ambiente do painel antes de autorizar.",
  },
  invalid: {
    tone: "border-red-400/25 bg-red-400/10 text-red-200",
    text: "A autorização expirou ou não pôde ser validada. Tente novamente.",
  },
  failed: {
    tone: "border-red-400/25 bg-red-400/10 text-red-200",
    text: "O Melhor Envio recusou a autorização. Confira a URL de callback cadastrada.",
  },
};

export default async function FretesPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const [integration, settings, params, requestHeaders, balance] = await Promise.all([
    getShippingIntegrationStatus(),
    getShippingSettings(),
    searchParams,
    headers(),
    getMelhorEnvioBalance(),
  ]);
  const balanceError = balance.error;
  const balanceValue = balance.value;
  const hasBalance = balanceValue !== null;
  const isLiveBalance = balance.status === "live";
  const isStaleBalance = balance.status === "stale";
  const authorizationError = balanceError
    ? /unauthor|autoriz|permiss/i.test(balanceError)
    : false;
  const oauthMessage = params.oauth ? oauthMessages[params.oauth] : null;
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const callbackUrl = host
    ? `${protocol}://${host}/api/integrations/melhor-envio/callback`
    : "/api/integrations/melhor-envio/callback";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-white/50">
          Cotação, compra, geração de etiquetas e rastreio pelo Melhor Envio.
        </p>
        <p className="mt-1 text-xs text-white/30">Tokens e segredos nunca são exibidos no painel.</p>
      </div>

      {oauthMessage ? (
        <p className={`rounded-lg border px-4 py-3 text-sm ${oauthMessage.tone}`}>
          {oauthMessage.text}
        </p>
      ) : null}

      <section className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Integração</p>
            <h2 className="font-display mt-2 text-xl font-bold">Melhor Envio</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 ${integration.configured ? "bg-[#A9EC17]/10 text-[#A9EC17]" : "bg-amber-400/10 text-amber-200"}`}>
                {integration.configured ? "Token conectado" : "Sem token"}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/50">{integration.environment}</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/50">
                CEP {settings?.cepOrigem ?? integration.originCep ?? "não cadastrado"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:flex-row">
            <a
              href="/api/integrations/melhor-envio/connect"
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${integration.oauthConfigured ? "bg-[#A9EC17] text-black" : "pointer-events-none bg-white/10 text-white/30"}`}
            >
              <KeyRound className="h-4 w-4" />
              {integration.configured ? "Reautorizar permissões" : "Autorizar integração"}
            </a>
            <a
              href="https://melhorenvio.com.br"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white"
            >
              Abrir Melhor Envio <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/[0.07] bg-[#090909] p-4">
            <MapPin className="h-4 w-4 text-[#A9EC17]" />
            <p className="mt-2 text-xs text-white/40">URL de callback para cadastrar na Área Dev.</p>
            <code className="mt-1 block break-all text-xs text-white/70">
              {callbackUrl}
            </code>
          </div>
          <div className={`rounded-lg border p-4 ${isLiveBalance ? "border-[#A9EC17]/15 bg-[#A9EC17]/[0.04]" : "border-amber-400/15 bg-amber-400/[0.04]"}`}>
            {hasBalance ? (
              <WalletCards className={`h-4 w-4 ${isLiveBalance ? "text-[#A9EC17]" : "text-amber-300"}`} />
            ) : (
              <TriangleAlert className="h-4 w-4 text-amber-300" />
            )}
            <p className="mt-2 text-xs font-semibold text-white/70">Melhor Carteira</p>
            {hasBalance ? (
              <>
                <p className={`mt-1 text-xl font-bold ${isLiveBalance ? "text-[#A9EC17]" : "text-amber-200"}`}>
                  {balanceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/40">
                  {isStaleBalance
                    ? "Última consulta conhecida (desatualizada). Não foi possível atualizar agora."
                    : "Saldo disponível para compra de etiquetas."}
                </p>
                {isStaleBalance && balanceError ? (
                  <p className="mt-1 text-xs leading-5 text-amber-200/75">
                    {balanceError}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-amber-200">
                  Não foi possível consultar o saldo
                </p>
                <p className="mt-1 text-xs leading-5 text-white/45" title={balanceError ?? undefined}>
                  {authorizationError
                    ? "Reautorize a conta Melhor Envio para liberar a consulta da carteira."
                    : balanceError ?? "Confira a integração com a loja e tente novamente."}
                </p>
              </>
            )}
            {balance.checkedAt ? (
              <p className="mt-2 text-[11px] text-white/30">
                {isStaleBalance ? "Consulta conhecida" : "Última consulta"}: {new Date(balance.checkedAt).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <ShippingSettingsForm initial={settings} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <Box className="h-5 w-5 text-[#A9EC17]" />
          <h2 className="mt-3 font-semibold">Fluxo operacional</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Abra um pedido pago, envie ao carrinho, compre a etiqueta, gere e imprima. Cada etapa fica registrada no pedido.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <TriangleAlert className="h-5 w-5 text-amber-300" />
          <h2 className="mt-3 font-semibold">Documento fiscal</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Venda comercial deve usar NF-e. Declaração de conteúdo só aparece mediante confirmação de que o envio é não comercial e permitido.
          </p>
        </div>
      </section>
    </div>
  );
}
