import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/registrations/policy";
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string;assetId:string}>}){
  const {eventId,assetId}=await params;
  const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
  if(!isUuid(eventId)||!isUuid(assetId))return new Response("Not found",{status:404,headers});
  const client=await createServerSupabaseClient();if(!client)return new Response("Not found",{status:404,headers});
  const {data:asset,error}=await client.from("event_banner_assets").select("path").eq("id",assetId).eq("event_id",eventId).eq("state","active").maybeSingle();
  if(error||!asset)return new Response("Not found",{status:404,headers});
  const {data,error:downloadError}=await client.storage.from("nebula-event-banners").download(asset.path);
  if(downloadError||!data)return new Response("Not found",{status:404,headers});
  return new Response(await data.arrayBuffer(),{headers:{...headers,"Content-Type":"image/webp"}});
}
