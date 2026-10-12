"use client";
import { useState } from "react";
import { Download } from "lucide-react";
export function ExportButton({eventId,competitionId}:{eventId:string;competitionId?:string}) {
  const [pending,setPending]=useState(false),[error,setError]=useState("");
  async function download() {
    if(pending)return;setPending(true);setError("");
    try {
      const response=await fetch(`/admin/exports/events/${eventId}${competitionId?`?competition=${encodeURIComponent(competitionId)}`:""}`,{cache:"no-store",redirect:"error"});
      if(!response.ok){const result=await response.json().catch(()=>({}));throw new Error(result.error||"Unable to download. Sign in again or retry.");}
      if(!response.headers.get("content-type")?.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))throw new Error("The export response was invalid. Please retry.");
      const url=URL.createObjectURL(await response.blob());const anchor=document.createElement("a");anchor.href=url;anchor.download=response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1]||"Nebula_Registrations.xlsx";document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(cause){setError(cause instanceof Error?cause.message:"Unable to download. Please retry.");}finally{setPending(false);}
  }
  return <div><button type="button" className="action-link action-secondary" onClick={download} disabled={pending} aria-busy={pending}><Download size={18} aria-hidden="true"/>{pending?"Generating Excel…":competitionId?"Export Game Registrations":"Export Entire Event"}</button>{error&&<p role="alert" className="form-message form-error">{error}</p>}</div>;
}
