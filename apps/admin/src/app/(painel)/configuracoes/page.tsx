import SettingsForm from "@/components/configuracoes/SettingsForm";
import { getStoreSettings } from "@/lib/services/settingsAdminService";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  return <SettingsForm initial={await getStoreSettings()} />;
}
