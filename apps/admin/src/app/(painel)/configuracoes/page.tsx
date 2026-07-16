import SettingsForm, { type SettingsFormInitial } from "@/components/configuracoes/SettingsForm";
import { config } from "@/lib/config";
import { getStoreSettings } from "@/lib/services/settingsAdminService";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const settings = await getStoreSettings();
  const initial: SettingsFormInitial = {
    ...settings,
    updatedAt: settings.updatedAt.toISOString(),
  };
  return <SettingsForm initial={initial} storefrontUrl={config.storefrontUrl ?? "https://www.ecomzero.com.br"} />;
}
