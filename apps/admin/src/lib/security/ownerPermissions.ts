export const OWNER_ONLY_SETTING_KEYS = [
  "metaPixelAtivo",
  "metaPixelId",
  "googleAnalyticsAtivo",
  "googleAnalyticsId",
  "googleTagManagerAtivo",
  "googleTagManagerId",
  "tiktokPixelAtivo",
  "tiktokPixelId",
  "customHeadCodeAtivo",
  "customHeadCode",
] as const;

type OwnerOnlySettings = Record<
  (typeof OWNER_ONLY_SETTING_KEYS)[number],
  boolean | string | null | undefined
>;

function normalized(value: boolean | string | null | undefined) {
  return value === undefined || value === "" ? null : value;
}

export function ownerOnlySettingsChanged(
  current: OwnerOnlySettings,
  requested: OwnerOnlySettings,
): boolean {
  return OWNER_ONLY_SETTING_KEYS.some(
    (key) => normalized(current[key]) !== normalized(requested[key]),
  );
}
