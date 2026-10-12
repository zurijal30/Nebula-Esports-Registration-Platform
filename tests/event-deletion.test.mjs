import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanDeletedEventBanners,exactEventConfirmation} from '../src/lib/admin/event-deletion.ts';
test('deletion requires an exact event name, including case and whitespace',()=>{
  assert.equal(exactEventConfirmation('Arena','Arena'),true);
  for(const value of ['arena','Arena ',' Arena','',null,undefined])assert.equal(exactEventConfirmation('Arena',value),false);
});
test('committed deletion reports Storage failures and attempts only supplied owned paths',async()=>{
  const removed=[],finished=[];
  assert.equal(await cleanDeletedEventBanners(['own/a.webp','own/b.webp'],async p=>{removed.push(p);return p!=='own/a.webp';},async p=>{finished.push(p);return true;}),false);
  assert.deepEqual(removed,['own/a.webp','own/b.webp']);assert.deepEqual(finished,['own/b.webp']);
  assert.equal(await cleanDeletedEventBanners(['own/a.webp'],async()=>{throw Error('Storage offline');},async()=>true),false);
  assert.equal(await cleanDeletedEventBanners(['own/a.webp'],async()=>true,async()=>false),false);
  assert.equal(await cleanDeletedEventBanners(['own/a.webp'],async()=>true,async()=>true),true);
  assert.equal(await cleanDeletedEventBanners([],async()=>{throw Error('must not touch default');},async()=>false),true);
});
