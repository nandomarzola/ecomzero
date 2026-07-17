export function isAnnouncementEligibleForUf(
  eligibleRegions: readonly string[],
  visitorUf: string | null,
) {
  if (eligibleRegions.length === 0) return true;
  if (!visitorUf) return false;
  return eligibleRegions.includes(visitorUf.trim().toUpperCase());
}
