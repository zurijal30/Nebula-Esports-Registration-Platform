"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/auth/config";
export function LiveEventRefresh(){const router=useRouter();const path=usePathname();useEffect(()=>{
  if((path!=="/"&&!path.startsWith("/tournaments"))||!getSupabaseConfig())return;const client=createBrowserSupabaseClient();let version:number|undefined;let disposed=false;
  const refresh=()=>router.refresh();
  const check=async()=>{const {data}=await client.from("event_public_refresh").select("version").eq("id",true).maybeSingle();if(disposed||!data)return;if(version!==undefined&&version!==data.version)refresh();version=data.version;};
  const channel=client.channel("nebula-public-event-refresh").on("postgres_changes",{event:"UPDATE",schema:"public",table:"event_public_refresh"},()=>{refresh();void check();}).subscribe(status=>{if(status==="SUBSCRIBED"){refresh();void check();}});
  void check();const interval=setInterval(()=>{if(document.visibilityState==="visible")void check();},15000);
  const focus=()=>{refresh();void check();};window.addEventListener("focus",focus);
  return()=>{disposed=true;clearInterval(interval);window.removeEventListener("focus",focus);void client.removeChannel(channel);};
},[router,path]);return null;}
