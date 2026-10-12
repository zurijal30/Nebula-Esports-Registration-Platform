import { canAccessAdmin } from "../auth/policy.ts";
import { isUuid } from "../registrations/policy.ts";
import { createExportWorkbook, exportFilename, type ExportSnapshot } from "./export-workbook.ts";
export const exportHeaders={"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
export const MAX_EXPORT_BYTES=4*1024*1024;
interface ExportDependencies {
  account:()=>Promise<{user:{id:string}|null;profile:{id:string;role:string}|null;profileError?:boolean}>;
  snapshot:(eventId:string,competitionId:string|null)=>Promise<{data:ExportSnapshot|{error:string}|null;error:{message?:string;code?:string}|null}>;
}
export async function exportResponse(request:Request,eventId:string,deps:ExportDependencies) {
  const fail=(error:string,status:number)=>Response.json({error},{status,headers:exportHeaders});
  try {
    const account=await deps.account();
    if(!account.user)return fail("Sign in as an administrator to download registrations.",401);
    if(!canAccessAdmin(account.user.id,account.profile)||account.profileError)return fail("Administrator access is required.",403);
    const url=new URL(request.url),competition=url.searchParams.get("competition");
    if(!isUuid(eventId)||(competition!==null&&!isUuid(competition))||url.searchParams.getAll("competition").length>1)return fail("Choose a valid event or competition.",400);
    const {data,error}=await deps.snapshot(eventId,competition);
    if(error){if(error.message==="admin_required")return fail("Administrator access is required.",403);if(["event_unavailable","competition_unavailable"].includes(error.message??""))return fail("This event or competition is unavailable.",404);return fail("Export unavailable. Check that the Phase 6 migration is applied, then retry.",503);}
    if(!data)return fail("Export data is unavailable. Please retry.",503);
    if("error" in data)return fail(data.error==="export_too_large"?"This export exceeds 50,000 registrations or participants. Export a smaller competition.":"Export data is unavailable.",data.error==="export_too_large"?413:503);
    if(data.eventId!==eventId||(competition&&(data.competitions.length!==1||data.competitions[0].id!==competition)))return fail("Export scope could not be verified. Please retry.",503);
    const bytes=await createExportWorkbook(data);
    if(bytes.byteLength>MAX_EXPORT_BYTES)return fail("This Excel file exceeds the download size limit. Export a smaller competition.",413);
    return new Response(bytes,{headers:{...exportHeaders,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${exportFilename(data.eventTitle,competition?data.competitions[0].title:undefined)}"`}});
  } catch {return fail("Unable to generate the Excel file. Please retry or export a smaller competition.",503);}
}
