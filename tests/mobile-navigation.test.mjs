import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=moduleUrl(`import React from '${import.meta.resolve('react')}';export const usePathname=()=>'/';export function Brand(){return React.createElement('a',{href:'/'},'Nebula');}export default function Link({children,...props}){return React.createElement('a',props,children);}`);
let source=await readFile(new URL('../src/components/layout/header.tsx',import.meta.url),'utf8');
for(const [from,to] of Object.entries({'next/link':stub,'next/navigation':stub,'./brand':stub,'@/lib/site':new URL('../src/lib/site.ts',import.meta.url).href}))source=source.replaceAll('"'+from+'"',JSON.stringify(to));
const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,q,name)=>`from ${q}${import.meta.resolve(name)}${q}`);
const {Header}=await import(moduleUrl(output));
test('actual navigation keeps accessible disclosure and correct guest/player/admin account destinations',()=>{
  for(const role of ['guest','player','admin']){
    const html=renderToStaticMarkup(React.createElement(Header,{signedIn:role!=='guest'}));
    assert.match(html,/type="button"[^>]*aria-label="Open navigation"[^>]*aria-expanded="false"[^>]*aria-controls="primary-navigation"/);
    for(const href of ['/','/tournaments','/about'])assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes(role==='guest'?'href="/sign-in"':'href="/dashboard"'));
    assert.ok(html.includes(role==='guest'?'Sign In':'My Account'));
    assert.equal((html.match(/id="primary-navigation"/g)||[]).length,1);
  }
});
