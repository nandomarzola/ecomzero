import assert from "node:assert/strict";
import test from "node:test";
import { ownerOnlySettingsChanged } from "./security/ownerPermissions";
import {
  buildTotpUri,
  createTwoFactorSetupToken,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  findRecoveryCodeHash,
  generateRecoveryCodes,
  generateTotp,
  parseRecoveryCodeHashes,
  readTwoFactorSetupToken,
  serializeRecoveryCodeHashes,
  verifyTotp,
} from "./security/twoFactor";
import {
  getSessionIssuedAt,
  isSessionValidForCutoff,
} from "./security/sessionSecurity";

const masterKey = "test-secret-with-at-least-thirty-two-characters";

test("TOTP segue o vetor RFC 6238 e aceita somente a janela configurada", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(generateTotp(secret, 59_000), "287082");
  assert.equal(verifyTotp(secret, "287082", 59_000), 1);
  assert.equal(verifyTotp(secret, "287082", 120_000), null);
  assert.equal(verifyTotp(secret, "123"), null);
});

test("segredo TOTP fica cifrado e falha se o payload for adulterado", () => {
  const encrypted = encryptTwoFactorSecret("JBSWY3DPEHPK3PXP", masterKey);
  assert.equal(decryptTwoFactorSecret(encrypted, masterKey), "JBSWY3DPEHPK3PXP");
  assert.notEqual(encrypted, "JBSWY3DPEHPK3PXP");
  assert.throws(() => decryptTwoFactorSecret(`${encrypted.slice(0, -1)}A`, masterKey));
});

test("token de configuração é vinculado ao admin e expira", () => {
  const token = createTwoFactorSetupToken(
    { adminId: "admin-1", secret: "SECRET", expiresAt: 2_000 },
    masterKey,
  );
  assert.deepEqual(readTwoFactorSetupToken(token, masterKey, 1_000), {
    adminId: "admin-1",
    secret: "SECRET",
  });
  assert.throws(() => readTwoFactorSetupToken(token, masterKey, 2_001));
});

test("códigos de recuperação são únicos e persistidos somente como hash", () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  const serialized = serializeRecoveryCodeHashes(codes, masterKey);
  assert.equal(serialized.includes(codes[0]), false);
  const hashes = parseRecoveryCodeHashes(serialized);
  assert.equal(hashes.length, 10);
  assert.equal(findRecoveryCodeHash(codes[0].toLowerCase(), hashes, masterKey), hashes[0]);
  assert.equal(findRecoveryCodeHash("AAAAA-AAAAA", hashes, masterKey), null);
});

test("URI TOTP não expõe parâmetros fora do padrão esperado", () => {
  const uri = new URL(buildTotpUri({ secret: "ABCDEF23", accountName: "admin@example.com" }));
  assert.equal(uri.protocol, "otpauth:");
  assert.equal(uri.searchParams.get("secret"), "ABCDEF23");
  assert.equal(uri.searchParams.get("algorithm"), "SHA1");
  assert.equal(uri.searchParams.get("digits"), "6");
  assert.equal(uri.searchParams.get("period"), "30");
});

test("revogação mantém o instante original e invalida JWT anterior ao corte", () => {
  const issuedAt = getSessionIssuedAt({ sessionIssuedAt: 1_750_000_000_123, iat: 1 });
  assert.equal(issuedAt, 1_750_000_000_123);
  const cutoff = new Date(1_750_000_000_124);
  assert.equal(isSessionValidForCutoff(issuedAt!, cutoff), false);
  assert.equal(isSessionValidForCutoff(cutoff.getTime(), cutoff), true);
});

test("staff só pode salvar configurações quando campos owner permanecem iguais", () => {
  const current = {
    metaPixelAtivo: true,
    metaPixelId: "12345",
    googleAnalyticsAtivo: false,
    googleAnalyticsId: null,
    googleTagManagerAtivo: false,
    googleTagManagerId: null,
    tiktokPixelAtivo: false,
    tiktokPixelId: null,
    customHeadCodeAtivo: false,
    customHeadCode: null,
  };
  assert.equal(ownerOnlySettingsChanged(current, { ...current }), false);
  assert.equal(ownerOnlySettingsChanged(current, { ...current, customHeadCodeAtivo: true }), true);
  assert.equal(ownerOnlySettingsChanged(current, { ...current, metaPixelId: "99999" }), true);
});
