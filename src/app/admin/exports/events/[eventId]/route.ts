import { getCurrentAccount } from "@/lib/auth/account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { exportResponse } from "@/lib/admin/export-response";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=await params;
  return exportResponse(request,eventId,{account:getCurrentAccount,snapshot:async(event,competition)=>{
    const client=await createServerSupabaseClient();
    if(!client)return {data:null,error:{message:"unavailable"}};
    return client.rpc("admin_export_registrations",{p_event:event,p_competition:competition});
  }});
}
