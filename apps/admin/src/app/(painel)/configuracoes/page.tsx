import SettingsForm, { type SettingsFormInitial } from "@/components/configuracoes/SettingsForm";
import { config } from "@/lib/config";
import { getAnnouncementBarItems, getStoreSettings } from "@/lib/services/settingsAdminService";
import { listCoupons } from "@/lib/services/couponAdminService";
import { getAdminSecurityStatus } from "@/lib/actions/adminSecurity";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [settings, announcementItems, coupons, securityStatus] = await Promise.all([
    getStoreSettings(),
    getAnnouncementBarItems(),
    listCoupons(),
    getAdminSecurityStatus(),
  ]);
  const initial: SettingsFormInitial = {
    ...settings,
    fontFamily: settings.fontFamily as SettingsFormInitial["fontFamily"],
    productCardStyle: settings.productCardStyle as SettingsFormInitial["productCardStyle"],
    cardCornerStyle: settings.cardCornerStyle as SettingsFormInitial["cardCornerStyle"],
    buttonStyle: settings.buttonStyle as SettingsFormInitial["buttonStyle"],
    footerCopyrightAno: settings.footerCopyrightAno as SettingsFormInitial["footerCopyrightAno"],
    announcementItems,
    updatedAt: settings.updatedAt.toISOString(),
  };
  if (!securityStatus) return null;
  return <SettingsForm initial={initial} coupons={coupons} storefrontUrl={config.storefrontUrl ?? "https://www.ecomzero.com.br"} securityStatus={securityStatus} />;
}
