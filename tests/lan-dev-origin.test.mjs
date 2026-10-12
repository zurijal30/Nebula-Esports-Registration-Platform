import test from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config.ts';
import { blockCrossSiteDEV } from 'next/dist/server/lib/router-utils/block-cross-site-dev.js';

test('installed Next dev guard permits the exact LAN host but keeps unrelated dev asset origins blocked',()=>{
  for(const path of ['/_next/static/chunks/app.js','/_next/hmr']){
    for(const allowed of [true,false]){
      const response={statusCode:200,end(){this.ended=true;}};
      const req={url:path,headers:{origin:allowed?'http://192.168.1.9:3000':'https://untrusted.example'}};
      assert.equal(blockCrossSiteDEV(req,response,nextConfig.allowedDevOrigins,'localhost'),!allowed);
      assert.equal(response.statusCode,allowed?200:403);
    }
    const response={statusCode:200,end(){this.ended=true;}};
    assert.equal(blockCrossSiteDEV({url:path,headers:{'sec-fetch-mode':'no-cors','sec-fetch-site':'cross-site',referer:'http://192.168.1.9:3000/'}},response,nextConfig.allowedDevOrigins,'localhost'),false);
  }
  assert.deepEqual(nextConfig.allowedDevOrigins,['192.168.1.9']);
});
