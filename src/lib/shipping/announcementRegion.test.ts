import assert from "node:assert/strict";
import test from "node:test";
import { isAnnouncementEligibleForUf } from "@/lib/client/announcementRegion";

test("mensagem sem região aparece para qualquer visitante", () => {
  assert.equal(isAnnouncementEligibleForUf([], null), true);
  assert.equal(isAnnouncementEligibleForUf([], "SP"), true);
});

test("mensagem regional exige uma UF elegível conhecida", () => {
  assert.equal(isAnnouncementEligibleForUf(["SP", "RJ"], null), false);
  assert.equal(isAnnouncementEligibleForUf(["SP", "RJ"], "MG"), false);
  assert.equal(isAnnouncementEligibleForUf(["SP", "RJ"], "sp"), true);
});
