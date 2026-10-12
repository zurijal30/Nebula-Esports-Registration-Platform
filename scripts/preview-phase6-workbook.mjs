// Synthetic fixtures only; never reads env files or Supabase.
import {writeFile} from 'node:fs/promises';
import {createExportWorkbook} from '../src/lib/admin/export-workbook.ts';
const output=process.argv[2];if(!output)throw Error('Provide a local preview output path.');
const competition='22222222-2222-4222-8222-222222222222';
const snapshot={eventId:'11111111-1111-4111-8111-111111111111',eventTitle:'Nebula Arena — Synthetic Preview',generatedAt:'2026-10-11T00:00:00Z',competitions:[{id:competition,title:'VALORANT',type:'team',registrations:[{id:'33333333-3333-4333-8333-333333333333',competitionId:competition,status:'active',source:'player',type:'team',team:'Nebula Squad',clan:'Arena Clan',createdAt:'2026-10-10T22:00:00Z',ownerEmail:'captain@example.invalid',players:[{id:'captain',fullName:'Sample Captain',ign:'NebulaCaptain',gameId:'9999999999999999999',phone:'0771234567',isCaptain:true,order:0},{id:'mate',fullName:'Sample Teammate',ign:'NebulaMate',gameId:'000112233',phone:'+94771234567',isCaptain:false,order:1}]}]},{id:'44444444-4444-4444-8444-444444444444',title:'Tekken 8',type:'solo',registrations:[]}]};
await writeFile(output,await createExportWorkbook(snapshot));console.log('Synthetic preview workbook written.');
