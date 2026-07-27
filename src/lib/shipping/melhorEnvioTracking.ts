export type MelhorEnvioTrackingPayload = Record<string, unknown>;

function asObject(value: unknown): MelhorEnvioTrackingPayload | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MelhorEnvioTrackingPayload)
    : null;
}

function isTrackingPayload(value: MelhorEnvioTrackingPayload) {
  return (
    "status" in value ||
    "tracking" in value ||
    "tracking_url" in value ||
    "protocol" in value
  );
}

export function findMelhorEnvioTrackingPayload(
  value: unknown,
  expectedShipmentId?: string,
): MelhorEnvioTrackingPayload | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMelhorEnvioTrackingPayload(
        item,
        expectedShipmentId,
      );
      if (found) return found;
    }
    return null;
  }

  const object = asObject(value);
  if (!object) return null;

  if (isTrackingPayload(object)) {
    const id = typeof object.id === "string" ? object.id : null;
    if (!expectedShipmentId || !id || id === expectedShipmentId) {
      return object;
    }
  }

  if (expectedShipmentId && expectedShipmentId in object) {
    const exact = findMelhorEnvioTrackingPayload(
      object[expectedShipmentId],
      expectedShipmentId,
    );
    if (exact) return exact;
  }

  for (const nested of Object.values(object)) {
    const found = findMelhorEnvioTrackingPayload(
      nested,
      expectedShipmentId,
    );
    if (found) return found;
  }
  return null;
}
