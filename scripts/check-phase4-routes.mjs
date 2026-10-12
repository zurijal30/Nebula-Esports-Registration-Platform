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
const response=await fetch(origin+'/tournaments',{redirect:'manual'});
assert.equal(response.status,200);const page=await response.text();
assert.doesNotMatch(page,/DEMONSTRATION CONTENT|DEMO EVENT|fictional competition/);
console.log('PASS tournament discovery contains no runtime demonstration content');
