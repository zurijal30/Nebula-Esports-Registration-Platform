import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {createExportWorkbook,worksheetName,exportFilename,EXPORT_HEADERS} from '../src/lib/admin/export-workbook.ts';
import {exportResponse} from '../src/lib/admin/export-response.ts';
const event='11111111-1111-4111-8111-111111111111',comp='22222222-2222-4222-8222-222222222222',owner='33333333-3333-4333-8333-333333333333';
const player=(id,overrides={})=>({id,fullName:'Latest Player',ign:'=SUM(1,2)',gameId:'9999999999999999999999999',phone:'0771234567',isCaptain:true,order:0,...overrides});
const entry=(id,overrides={})=>({id,competitionId:comp,status:'active',source:'player',type:'team',team:'Latest Team',clan:'@Clan',createdAt:'2026-10-10T22:00:00Z',ownerEmail:'captain@example.invalid',players:[player('captain',{participantRole:'player_1'}),player('mate',{participantRole:'substitute_1',isCaptain:false,order:1,phone:'+94771234567'})],...overrides});
const snapshot=()=>({eventId:event,eventTitle:'Nebula Arena',generatedAt:'2026-10-11T00:00:00Z',competitions:[{id:comp,title:'VALORANT',type:'team',registrations:[entry('entry-1'),entry('cancelled',{status:'cancelled',players:[player('private-cancelled')]}),entry('manual',{source:'admin',ownerEmail:'admin@example.invalid',players:[player('manual-player',{phone:null,ign:null,gameId:null})]})]}]});
async function reopen(data){const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await createExportWorkbook(data));return workbook;}
test('ExcelJS workbook contains active current rosters, exact text contacts, safe literals and correct owner emails',async()=>{
  const wb=await reopen(snapshot()),s=wb.worksheets[0];
  assert.deepEqual(s.getRow(8).values.slice(1),EXPORT_HEADERS);assert.equal(s.getCell('B6').value,2);assert.equal(s.getCell('E6').value,3);
  assert.equal(s.getCell('E9').value,'Player 1');assert.equal(s.getCell('E10').value,'Substitute 1');assert.equal(s.getCell('J9').value,'captain@example.invalid');assert.equal(s.getCell('J10').value,null);assert.equal(s.getCell('J11').value,null);
  assert.equal(s.getCell('E11').value,'Unassigned');assert.equal(s.getCell('L9').value,'Yes');assert.equal(s.getCell('L10').value,'No');assert.equal(s.getCell('M9').value,8);
  assert.equal(s.getCell('B11').value,'Admin-created');assert.equal(s.getCell('C9').value,'Latest Team');assert.equal(s.getCell('I9').value,'0771234567');assert.equal(s.getCell('I10').value,'+94771234567');assert.equal(s.getCell('I11').value,null);
  assert.equal(s.getCell('H9').value,'9999999999999999999999999');assert.equal(s.getCell('G9').value,'=SUM(1,2)');assert.equal(s.getCell('D9').value,'@Clan');
  for(const column of ['G','H','I']){assert.equal(s.getCell(column+'9').type,ExcelJS.ValueType.String);assert.equal(s.getCell(column+'9').numFmt,'@');assert.equal(s.getCell(column+'9').formula,undefined);}
  assert.equal(s.rowCount,11);assert.equal(s.getCell('K9').value.toISOString(),'2026-10-11T03:30:00.000Z');assert.equal(s.getCell('B5').value.toISOString(),'2026-10-11T05:30:00.000Z');
  assert.equal(s.views[0].ySplit,8);assert.equal(s.getCell('A8').font.bold,true);assert.equal(s.getCell('A8').fill.fgColor.argb,'FF0B0E14');assert.ok(s.autoFilter);
});
test('multi-game workbook has unique valid sheet names and accurate empty/solo scopes',async()=>{
  const data=snapshot();data.competitions.push({id:'empty',title:'VALORANT',type:'solo',registrations:[]},{id:'solo',title:'[]*/?:\\Very long game title that exceeds thirty one characters',type:'solo',registrations:[entry('solo',{competitionId:'solo',type:'solo',players:[player('solo')],team:null,clan:null,ownerEmail:'solo@example.invalid'})]});
  const wb=await reopen(data);assert.equal(wb.worksheets.length,3);assert.equal(wb.worksheets[1].name,'VALORANT (2)');
  for(const s of wb.worksheets){assert.ok(s.name.length<=31);assert.doesNotMatch(s.name,/[\\/*?:\[\]]/);}
  assert.equal(wb.worksheets[1].getCell('B6').value,0);assert.match(wb.worksheets[1].getCell('A9').value,/No active registrations/);
  assert.equal(wb.worksheets[2].getCell('E9').value,'Solo');assert.equal(wb.worksheets[2].getCell('J9').value,'solo@example.invalid');
  const used=new Set();assert.equal(worksheetName('',used),'Competition');assert.notEqual(worksheetName('competition',used),'competition');assert.notEqual(worksheetName('History',used),'History');
  assert.equal(worksheetName(" 'Quoted' ",used),'Quoted');assert.ok(!worksheetName('a'.repeat(30)+"'rest",used).endsWith("'"));
  assert.equal(exportFilename('Arena\r\n";/evil','Game[]'),'Arena_evil_Game_Registrations.xlsx');
  assert.equal((await reopen({...data,competitions:[]})).worksheets[0].getCell('A3').value,'No game competitions in this event.');
});
test('every formula operator remains literal XLSX string data',async()=>{
  const data=snapshot();data.competitions[0].registrations=['=1+1','+SUM(1,1)','-1+1','@SUM(1,1)','\t=1+1'].map((value,i)=>entry(`literal-${i}`,{players:[player(`p-${i}`,{fullName:value,ign:value,gameId:value,phone:value})]}));
  const sheet=(await reopen(data)).worksheets[0];
  for(let i=0;i<5;i++)for(const column of [6,7,8,9]){const cell=sheet.getRow(9+i).getCell(column);assert.equal(cell.type,ExcelJS.ValueType.String);assert.equal(cell.formula,undefined);assert.equal(cell.value,data.competitions[0].registrations[i].players[0].fullName);}
});
test('exports retain over 1,000 grouped registrations without duplicate rows',async()=>{
  const data=snapshot();data.competitions[0].registrations=Array.from({length:1005},(_,i)=>entry(`reg-${i}`));
  const s=(await reopen(data)).worksheets[0];assert.equal(s.getCell('B6').value,1005);assert.equal(s.getCell('E6').value,2010);assert.equal(s.rowCount,2018);
  for(let i=0;i<1005;i++){assert.equal(s.getCell(`A${9+i*2}`).value,`reg-${i}`);assert.equal(s.getCell(`A${10+i*2}`).value,`reg-${i}`);assert.equal(s.getCell(`E${9+i*2}`).value,'Player 1');assert.equal(s.getCell(`E${10+i*2}`).value,'Substitute 1');}
});
test('download handler authorizes first, validates scope, prevents public caching and returns real xlsx bytes',async()=>{
  let calls=0;const request=id=>new Request(`http://localhost/admin/exports/events/${event}${id===undefined?'':`?competition=${id}`}`);
  const deps={account:async()=>({user:{id:owner},profile:{id:owner,role:'admin'}}),snapshot:async()=>{calls++;return {data:snapshot(),error:null};}};
  for(const [account,status] of [[{user:null,profile:null},401],[{user:{id:owner},profile:{id:owner,role:'player'}},403],[{user:{id:owner},profile:{id:event,role:'admin'}},403]]){const result=await exportResponse(request(),event,{...deps,account:async()=>account});assert.equal(result.status,status);assert.match(result.headers.get('cache-control'),/private, no-store/);}
  assert.equal(calls,0);assert.equal((await exportResponse(request(), 'invalid',deps)).status,400);assert.equal((await exportResponse(request('invalid'),event,deps)).status,400);
  assert.equal((await exportResponse(request(comp),event,deps)).status,200);
  const result=await exportResponse(request(),event,deps);assert.equal(result.status,200);assert.match(result.headers.get('content-disposition'),/Nebula_Arena_Registrations.xlsx/);assert.equal(result.headers.get('vary'),'Cookie');assert.match(result.headers.get('cache-control'),/no-store/);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await result.arrayBuffer());assert.equal(wb.worksheets.length,1);
  assert.equal((await exportResponse(request(event),event,deps)).status,503);
  assert.equal((await exportResponse(request(),event,{...deps,snapshot:async()=>({data:null,error:{message:'admin_required'}})})).status,403);
  assert.equal((await exportResponse(request(),event,{...deps,snapshot:async()=>({data:null,error:{message:'event_unavailable'}})})).status,404);
  assert.equal((await exportResponse(request(),event,{...deps,snapshot:async()=>({data:{error:'export_too_large'},error:null})})).status,413);
});
