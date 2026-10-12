// Read-only local route checks; never submit forms or real participant data.
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://localhost:3000';
const id='00000000-0000-4000-8000-000000000000';
for(const path of [`/admin/events/${id}`,`/admin/registrations/${id}`,`/dashboard/registrations/${id}/edit`,`/tournaments/live/unknown/register/${id}`]){
  const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,307,path);
  const target=new URL(response.headers.get('location'),origin);assert.equal(target.origin,origin);assert.equal(target.pathname,'/sign-in');assert.match(response.headers.get('cache-control'),/no-store/);
  console.log('PASS anonymous detail/form route guarded: '+path);
}
for(const path of [`/game-images/${id}/${id}`,'/game-images/invalid/invalid','/event-images/invalid/invalid','/tournaments/live/phase7a-nonexistent']){
  const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,404,path);
  console.log('PASS missing/invalid resource rejected: '+path);
}
