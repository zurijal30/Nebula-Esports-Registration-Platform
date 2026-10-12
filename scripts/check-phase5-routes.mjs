import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://localhost:3000';
for(const path of ['/admin','/admin/events','/admin/events/new','/admin/games','/admin/registrations','/admin/registrations/new','/admin/users']){
 const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,307);
 const target=new URL(response.headers.get('location'),origin);assert.equal(target.origin,origin);assert.equal(target.pathname,'/sign-in');
 console.log(`PASS anonymous admin route blocked: ${path}`);
}
const image=await fetch(origin+'/event-images/00000000-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000000');assert.equal(image.status,404);assert.match(image.headers.get('cache-control'),/no-store/);
console.log('PASS unknown/private image route fails closed and is not cached');
