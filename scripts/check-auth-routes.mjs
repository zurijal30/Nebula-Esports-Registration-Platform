// Run with the development server already running. No accounts are submitted.
import assert from "node:assert/strict";

const origin = "http://localhost:3000";
for (const path of ["/sign-in", "/sign-up", "/forgot-password", "/tournaments", "/"]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  assert.equal(response.status, 200, path);
  console.log(`${path}: 200`);
}
for (const path of ["/dashboard", "/admin", "/update-password"]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  assert.equal(response.status, 307, path);
  const destination = new URL(response.headers.get("location"), origin);
  assert.equal(destination.origin, origin);
  assert.equal(destination.pathname, "/sign-in");
  assert.equal(destination.searchParams.get("next"), path);
  console.log(`${path}: unauthenticated access redirected to sign-in`);
}
for (const path of ["/auth/callback?next=https%3A%2F%2Fevil.invalid", "/auth/callback?error=access_denied&next=%2F%2Fevil.invalid", "/auth/confirm?type=admin&token_hash=invalid"]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location"), origin);
  assert.equal(destination.origin, origin);
  assert.equal(destination.pathname, "/sign-in");
  assert.ok(destination.searchParams.has("error"));
  assert.equal(destination.searchParams.has("token_hash"), false);
  assert.equal(destination.searchParams.has("code"), false);
  console.log(`${path.split("?")[0]}: invalid callback safely rejected`);
}
assert.equal((await fetch(`${origin}/tournaments/unknown-event`, { redirect: "manual" })).status, 404);
console.log("Unknown tournament: 404");
