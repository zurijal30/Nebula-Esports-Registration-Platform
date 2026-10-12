import ExcelJS from "exceljs";
import { roleLabel } from "../registrations/roster-rules.ts";
export interface ExportPlayer {id:string;fullName:string;ign:string|null;gameId:string|null;phone:string|null;isCaptain:boolean;order:number;participantRole?:string|null}
export interface ExportRegistration {id:string;competitionId:string;status:"active";source:"player"|"admin";type:"solo"|"team";team:string|null;clan:string|null;createdAt:string;ownerEmail:string|null;players:ExportPlayer[]}
export interface ExportCompetition {id:string;title:string;type:"solo"|"team";registrations:ExportRegistration[];maxTeamSize?:number|null}
export interface ExportSnapshot {eventId:string;eventTitle:string;generatedAt:string;competitions:ExportCompetition[]}
export const EXPORT_LIMIT=50000;
export const EXPORT_HEADERS=["Registration ID","Registration Source","Team Name","Clan Name","Player Role","Full Name","In-Game Name (IGN)","Game ID / UID","Phone Number","Email Address","Registration Date & Time","Registration Captain","Team Maximum Size"];
export function worksheetName(title:string,used:Set<string>) {
  const base=title.replace(/[\\/*?:\[\]\x00-\x1f]/g," ").trim().replace(/^'+|'+$/g,"")||"Competition";
  let name=base.slice(0,31).replace(/'+$/g,"")||"Competition",index=2;
  if(name.toLowerCase()==="history")name="History game";
  while(used.has(name.toLowerCase())){const suffix=` (${index++})`;name=base.slice(0,31-suffix.length)+suffix;}
  used.add(name.toLowerCase());return name;
}
export function exportFilename(event:string,game?:string) {
  const clean=(v:string)=>v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,75)||"Nebula";
  return `${clean(event)}${game?`_${clean(game)}`:""}_Registrations.xlsx`;
}
function wallTime(iso:string) {const time=Date.parse(iso);if(!Number.isFinite(time))throw new Error("Invalid export timestamp");return new Date(time+330*60000);}
function literal(cell:ExcelJS.Cell,value:string|null) {cell.value=value??null;cell.numFmt="@";}
export async function createExportWorkbook(snapshot:ExportSnapshot) {
  const workbook=new ExcelJS.Workbook();workbook.creator="Nebula Esports";workbook.created=new Date(snapshot.generatedAt);
  const used=new Set<string>();let total=0;
  for(const competition of snapshot.competitions) {
    const registrations=competition.registrations.filter(r=>r.status==="active"&&r.competitionId===competition.id);
    const participants=registrations.reduce((count,r)=>count+r.players.length,0);total+=participants;
    if(total>EXPORT_LIMIT||registrations.length>EXPORT_LIMIT)throw new Error("export_too_large");
    const sheet=workbook.addWorksheet(worksheetName(competition.title,used),{properties:{tabColor:{argb:"FF15BBD0"}},views:[{state:"frozen",ySplit:8,xSplit:1,showGridLines:true}]});
    sheet.columns=[38,22,28,24,18,28,28,28,23,36,29,22,20].map(width=>({width}));
    sheet.mergeCells("A2:M2");sheet.getCell("A2").value="NEBULA ESPORTS";sheet.getCell("A2").font={name:"Arial",size:16,bold:true,color:{argb:"FF187BC7"}};sheet.getRow(2).height=28;
    literal(sheet.getCell("A3"),snapshot.eventTitle);sheet.mergeCells("A3:M3");sheet.getRow(3).height=24;
    literal(sheet.getCell("A4"),competition.title);sheet.mergeCells("A4:M4");sheet.getRow(4).height=24;
    sheet.getCell("A5").value="Generated (Asia/Colombo)";sheet.getCell("B5").value=wallTime(snapshot.generatedAt);sheet.getCell("B5").numFmt="yyyy-mm-dd hh:mm:ss";
    sheet.getCell("A6").value="Active registrations";sheet.getCell("B6").value=registrations.length;
    sheet.getCell("D6").value="Participants";sheet.getCell("E6").value=participants;
    sheet.getCell("A7").value="Registration timestamps use Asia/Colombo. Cancelled entries excluded. Team maximum is the current game rule.";sheet.mergeCells("A7:M7");
    sheet.getRow(8).values=EXPORT_HEADERS;sheet.getRow(8).height=36;
    for(const registration of registrations) {
      const players=[...registration.players].sort((a,b)=>Number(b.isCaptain)-Number(a.isCaptain)||a.order-b.order||a.id.localeCompare(b.id));
      for(const player of players) {
        const role=competition.type==="solo"?"Solo":roleLabel(player.participantRole);
        const email=registration.source==="player"&&(competition.type==="solo"||player.isCaptain)?registration.ownerEmail:null;
        const row=sheet.addRow([]);row.height=30;
        const values=[registration.id,registration.source==="admin"?"Admin-created":"Player-created",registration.team,registration.clan,role,player.fullName,player.ign,player.gameId,player.phone,email];
        values.forEach((v,index)=>literal(row.getCell(index+1),v));row.getCell(11).value=wallTime(registration.createdAt);row.getCell(11).numFmt="yyyy-mm-dd hh:mm:ss";
        literal(row.getCell(12),competition.type==="team"?(player.isCaptain?"Yes":"No"):null);row.getCell(13).value=competition.type==="team"?competition.maxTeamSize??8:null;row.getCell(13).numFmt="0";
      }
    }
    sheet.autoFilter={from:{row:8,column:1},to:{row:Math.max(8,sheet.rowCount),column:13}};
    if(!registrations.length){sheet.getCell("A9").value="No active registrations for this competition.";sheet.mergeCells("A9:M9");sheet.getRow(9).height=30;}
    sheet.eachRow(row=>row.eachCell({includeEmpty:true},cell=>{if(row.number!==2)cell.font={name:"Arial",size:11,color:{argb:"FF0B0E14"}};cell.alignment={vertical:"middle",horizontal:"left",wrapText:true};if(row.number===8){cell.font={name:"Arial",size:11,bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0B0E14"}};cell.alignment={vertical:"middle",horizontal:"center",wrapText:true};cell.border={bottom:{style:"medium",color:{argb:"FF15BBD0"}},right:{style:"thin",color:{argb:"FFFFFFFF"}}};}else if(row.number>8&&registrations.length){cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:row.number%2?"FFF1F6FA":"FFFFFFFF"}};const line:ExcelJS.Border={style:"thin",color:{argb:"FFDCE3E9"}};cell.border={top:line,bottom:line,left:line,right:line};}}));
    sheet.pageSetup={orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:8"};
  }
  if(!snapshot.competitions.length){const sheet=workbook.addWorksheet("Event",{views:[{state:"normal",showGridLines:true}]});sheet.getCell("A1").value="NEBULA ESPORTS";literal(sheet.getCell("A2"),snapshot.eventTitle);sheet.getCell("A3").value="No game competitions in this event.";sheet.getColumn(1).width=70;}
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
