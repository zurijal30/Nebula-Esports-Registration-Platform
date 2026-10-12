import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/registrations/policy";
export async function GET(_request:Request,{params}:{params:Promise<{gameId:string;assetId:string}>}){
  const {gameId,assetId}=await params;
  const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
  if(!isUuid(gameId)||!isUuid(assetId))return new Response("Not found",{status:404,headers});
  const client=await createServerSupabaseClient();if(!client)return new Response("Not found",{status:404,headers});
  const {data:asset,error}=await client.from("game_banner_assets").select("path").eq("id",assetId).eq("game_id",gameId).eq("state","active").maybeSingle();
  if(error||!asset)return new Response("Not found",{status:404,headers});
  const {data,error:downloadError}=await client.storage.from("nebula-game-banners").download(asset.path);
  if(downloadError||!data)return new Response("Not found",{status:404,headers});
  return new Response(await data.arrayBuffer(),{headers:{...headers,"Content-Type":"image/webp"}});
}
