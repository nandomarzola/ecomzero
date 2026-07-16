import SettingsForm, { type SettingsFormInitial } from "@/components/configuracoes/SettingsForm";
import { config } from "@/lib/config";
import { getAnnouncementBarItems, getStoreSettings } from "@/lib/services/settingsAdminService";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [settings, announcementItems] = await Promise.all([getStoreSettings(), getAnnouncementBarItems()]);
  const initial: SettingsFormInitial = {
    ...settings,
    fontFamily: settings.fontFamily as SettingsFormInitial["fontFamily"],
    productCardStyle: settings.productCardStyle as SettingsFormInitial["productCardStyle"],
    cardCornerStyle: settings.cardCornerStyle as SettingsFormInitial["cardCornerStyle"],
    buttonStyle: settings.buttonStyle as SettingsFormInitial["buttonStyle"],
    announcementItems,
    updatedAt: settings.updatedAt.toISOString(),
  };
  return <SettingsForm initial={initial} storefrontUrl={config.storefrontUrl ?? "https://www.ecomzero.com.br"} />;
}
