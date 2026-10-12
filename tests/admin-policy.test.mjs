import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {slugify,colomboInputToIso,toColomboInput,validateEvent,validateCompetition,adminError} from '../src/lib/admin/policy.ts';
import {prepareBanner,MAX_BANNER_BYTES} from '../src/lib/admin/banner.ts';
test('admin date inputs preserve Colombo wall time and reject invalid dates',()=>{
  assert.equal(colomboInputToIso('2026-11-01T18:00'),'2026-11-01T12:30:00.000Z');
  assert.equal(toColomboInput('2026-11-01T12:30:00Z'),'2026-11-01T18:00');
  for(const value of ['2026-02-30T18:00','2026-11-01','2026-11-01T25:00',''])assert.equal(colomboInputToIso(value),null);
  assert.equal(slugify('Arena Series: Round 2!'),'arena-series-round-2');
  const event={title:'Arena',venue:'Colombo',description:'',starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-11-02T00:00:00Z'};
  assert.equal(validateEvent(event),null);assert.ok(validateEvent({...event,ends_at:event.starts_at}));
  const c={registration_opens_at:'2026-10-01T00:00:00Z',registration_closes_at:'2026-10-20T00:00:00Z',starts_at:'2026-11-01T00:00:00Z',registration_fee_lkr:0};
  assert.equal(validateCompetition(c),null);assert.ok(validateCompetition({...c,registration_fee_lkr:-1}));assert.ok(validateCompetition({...c,starts_at:c.registration_opens_at}));
  assert.match(adminError('P0001','competition_has_registrations'),/cannot be changed/);
  assert.doesNotMatch(adminError('private','secret SQL'),/secret/);
});
test('banner processing fully decodes JPEG, PNG and WebP and rejects spoofed/oversized/corrupt content',async()=>{
  for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
    const bytes=await sharp({create:{width:80,height:40,channels:3,background:'#11b6ca'}}).toFormat(format).toBuffer();
    const output=await prepareBanner(bytes,mime);const meta=await sharp(output).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,80);assert.equal(meta.exif,undefined);
    await assert.rejects(prepareBanner(bytes,mime==='image/png'?'image/jpeg':'image/png'));
  }
  await assert.rejects(prepareBanner(new Uint8Array(MAX_BANNER_BYTES+1),'image/png'),/5 MB/);
  await assert.rejects(prepareBanner(Buffer.from('<svg><script>alert(1)</script></svg>'),'image/png'));
  await assert.rejects(prepareBanner(Buffer.from('broken'),'image/webp'));
  await assert.rejects(prepareBanner(Buffer.from('broken'),'image/svg+xml'));
});
