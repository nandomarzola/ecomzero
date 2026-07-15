import BannerManager from "@/components/banners/BannerManager";
import { listBanners } from "@/lib/services/bannerAdminService";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  return <BannerManager banners={await listBanners()} />;
}
