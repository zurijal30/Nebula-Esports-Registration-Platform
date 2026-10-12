import test from "node:test";
import assert from "node:assert/strict";
import { safeAuthDestination, canAccessAdmin, authErrorMessage, validateEmail, validatePassword, validateProfile } from "../src/lib/auth/policy.ts";
import { parseSupabaseConfig } from "../src/lib/auth/config.ts";
import { parseSiteOrigin } from "../src/lib/auth/site-origin.ts";

test("OAuth return destinations reject open redirect payloads", () => {
  for (const value of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "%2F%2Fevil.invalid", "/dashboard/../../evil", "/dashboard?next=https://evil.invalid", ["/admin"], null, "javascript:alert(1)"]) {
    assert.equal(safeAuthDestination(value), "/dashboard");
  }
  assert.equal(safeAuthDestination("/admin"), "/admin");
  assert.equal(safeAuthDestination("/update-password"), "/update-password");
});

test("administrator access requires verified matching identity and trusted role", () => {
  assert.equal(canAccessAdmin(undefined, { id: "user", role: "admin" }), false);
  assert.equal(canAccessAdmin("user", null), false);
  assert.equal(canAccessAdmin("user", { id: "other", role: "admin" }), false);
  assert.equal(canAccessAdmin("user", { id: "user", role: "player" }), false);
  assert.equal(canAccessAdmin("user", { id: "user", role: "staff" }), false);
  assert.equal(canAccessAdmin("user", { id: "user", role: "admin" }), true);
});

test("public config rejects privileged keys and credential-bearing URLs", () => {
  assert.equal(parseSupabaseConfig(undefined, undefined), null);
  assert.equal(parseSupabaseConfig("https://example.supabase.co", "sb_secret_test"), null);
  const jwt = (role) => `header.${btoa(JSON.stringify({ role }))}.signature`;
  assert.equal(parseSupabaseConfig("https://example.supabase.co", jwt("service_role")), null);
  assert.ok(parseSupabaseConfig("https://example.supabase.co", jwt("anon")));
  assert.ok(parseSupabaseConfig("https://example.supabase.co", "sb_publishable_test"));
  assert.equal(parseSupabaseConfig("https://user:password@example.supabase.co", "sb_publishable_test"), null);
  assert.equal(parseSupabaseConfig("http://example.supabase.co", "sb_publishable_test"), null);
});

test("email links use a canonical safe origin without Host-header trust", () => {
  assert.equal(parseSiteOrigin(undefined, true), null);
  assert.equal(parseSiteOrigin(undefined, false), "http://localhost:3000");
  assert.equal(parseSiteOrigin("https://nebula.example/", true), "https://nebula.example");
  for (const value of ["https://user:secret@nebula.example", "https://nebula.example/path", "https://nebula.example?next=evil", "javascript:alert(1)", "http://nebula.example"]) assert.equal(parseSiteOrigin(value, true), null);
});

test("server validation protects password and editable profile boundaries", () => {
  assert.equal(validateEmail("invalid"), false);
  assert.equal(validateEmail("player@example.invalid"), true);
  assert.ok(validatePassword("short", "short"));
  assert.ok(validatePassword("longpassword123", "differentpassword"));
  assert.equal(validatePassword("longpassword123", "longpassword123"), null);
  assert.ok(validateProfile("A", ""));
  assert.ok(validateProfile("Player", "<script>"));
  assert.equal(validateProfile("Player", "+94 711111111"), null);
  assert.equal(validateProfile("Player", ""), null);
  assert.match(authErrorMessage("invalid_credentials"), /email or password/i);
  assert.match(authErrorMessage("email_not_confirmed"), /confirm your email/i);
  assert.match(authErrorMessage("unknown_sensitive_provider_error"), /temporarily unavailable/i);
});
