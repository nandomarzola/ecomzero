type SessionTokenTimestamps = {
  sessionIssuedAt?: unknown;
  iat?: unknown;
};

export function getSessionIssuedAt(token: SessionTokenTimestamps): number | null {
  if (
    typeof token.sessionIssuedAt === "number" &&
    Number.isFinite(token.sessionIssuedAt) &&
    token.sessionIssuedAt > 0
  ) {
    return token.sessionIssuedAt;
  }

  if (typeof token.iat === "number" && Number.isFinite(token.iat) && token.iat > 0) {
    return token.iat * 1_000;
  }

  return null;
}

export function isSessionValidForCutoff(
  sessionIssuedAt: number,
  sessionsValidAfter: Date | null,
): boolean {
  return sessionsValidAfter === null || sessionIssuedAt >= sessionsValidAfter.getTime();
}
