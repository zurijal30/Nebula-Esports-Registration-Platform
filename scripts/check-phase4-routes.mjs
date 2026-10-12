import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3000';
const id = '11111111-1111-4111-8111-111111111111';
for (const path of ['/dashboard/registrations', `/dashboard/registrations/${id}/edit`, `/tournaments/live/test-event/register/${id}`]) {
  const response = await fetch(origin + path, { redirect: 'manual' });
  assert.equal(response.status,307);
  const destination = new URL(response.headers.get('location'),origin);
  assert.equal(destination.origin,origin); assert.equal(destination.pathname,'/sign-in'); assert.equal(destination.searchParams.get('next'),path);
  console.log(`PASS anonymous guard and return destination: ${path}`);
}
// Demo competition identifiers may differ; resolve the actual link from its event page.
const page = await fetch(origin + '/tournaments/arena-series').then((r) => r.text());
const match = page.match(/href="(\/tournaments\/arena-series\/register\/[^"#]+)"/);
assert.ok(match);
const preview = await fetch(origin + match[1]).then((r) => r.text());
assert.match(preview,/fictional competition/i); assert.doesNotMatch(preview,/name="players"/);
console.log('PASS demo registration remains informational, without a submission form');
