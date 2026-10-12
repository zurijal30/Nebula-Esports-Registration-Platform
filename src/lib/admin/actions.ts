"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminError, colomboInputToIso, slugify, validateCompetition, validateEvent } from "./policy";
import { prepareBanner } from "./banner";
import { exactGameConfirmation, validateGameReference } from "./game-policy";
import { gameBannerError, type GameBannerStage } from "./game-banner-error";
import { PARTICIPANT_ROLES } from "@/lib/registrations/roster-rules";
import { cleanDeletedEventBanners, exactEventConfirmation } from "./event-deletion";
import { isUuid, validateRegistration, type PlayerInput } from "@/lib/registrations/policy";
export interface AdminFormState {error?:string;success?:string;gameId?:string}
const text = (f:FormData,k:string)=>typeof f.get(k)==="string"?String(f.get(k)).trim():"";
async function client() { await requireAdmin(); const c=await createServerSupabaseClient({writable:true}); if(!c) throw new Error("Unavailable"); return c; }
function refresh() { revalidatePath("/","layout"); }
export async function deleteEventAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client();const id=text(form,"id"),confirmation=form.get("confirmation");
  if(!isUuid(id)||typeof confirmation!=="string")return {error:"Check the event and enter its exact name."};
  const {data:event,error:readError}=await c.from("events").select("title").eq("id",id).maybeSingle();
  if(readError)return {error:"Unable to check this event. Please retry."};
  if(!event)return {error:"This event no longer exists. Refresh the event list."};
  if(!exactEventConfirmation(event.title,confirmation))return {error:"Enter the exact current event name to confirm deletion."};
  let paths:string[];
  try {const {data,error}=await c.rpc("admin_delete_event",{p_event:id,p_confirmation:confirmation});if(error){if(error.code==="40P01"||error.code==="55P03")return {error:"The event is being updated. Please retry deletion."};return {error:adminError(error.code,error.message)};}paths=data??[];}
  catch{return {error:"Unable to confirm deletion. Refresh the list before retrying."};}
  refresh();
  const cleaned=await cleanDeletedEventBanners(paths,async path=>!(await c.storage.from("nebula-event-banners").remove([path])).error,async path=>{const {data,error}=await c.rpc("admin_finish_banner_cleanup",{p_path:path});return !error&&data===true;});
  redirect(`/admin/events?notice=${cleaned?"deleted":"deleted-cleanup"}`);
}
export async function saveEventAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client(); const id=text(form,"id");
  const values={title:text(form,"title"),description:text(form,"description"),venue:text(form,"venue"),slug:slugify(text(form,"slug")||text(form,"title")),
    starts_at:colomboInputToIso(text(form,"starts_at")),ends_at:colomboInputToIso(text(form,"ends_at")),status:text(form,"status"),is_published:text(form,"is_published")==="true"};
  const invalid=validateEvent(values); if(invalid) return {error:invalid};
  if((id&&!isUuid(id)) || !["scheduled","cancelled"].includes(values.status) || !values.slug) return {error:"Check the event URL and status."};
  if(id){const {data:existing}=await c.from("events").select("status,is_published").eq("id",id).maybeSingle();if(!existing)return {error:"Event unavailable."};if(((existing.is_published&&!values.is_published)||(existing.status==="scheduled"&&values.status==="cancelled"))&&text(form,"confirm")!=="yes")return {error:"Confirm unpublishing or cancelling this event."};}
  let eventId:string;
  try { const {data,error}=await c.rpc("admin_save_event",{p_values:values,p_id:id||null}); if(error)return {error:adminError(error.code,error.message)}; eventId=data; } catch{return {error:adminError()};}
  refresh(); redirect(`/admin/events/${eventId}?notice=saved`);
}
export async function saveGameAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client(); const id=text(form,"id"), title=text(form,"title"),reference=text(form,"reference_type"); const slug=slugify(title);
  if(!title || title.length>120 || !slug || (id&&!isUuid(id)))return {error:"Enter a game title of up to 120 characters."};
  if(!validateGameReference(reference))return {error:"Choose Solo, Team or Unspecified."};
  if(!["true","false"].includes(text(form,"is_active")))return {error:"Choose a catalogue visibility."};
  const maxInput=text(form,"max_team_size"),max=maxInput?Number(maxInput):null;
  const roles=form.getAll("available_roles").filter((r):r is string=>typeof r==="string");
  if(maxInput&&(!/^[0-9]+$/.test(maxInput)||!Number.isSafeInteger(max)||max!<1||max!>2147483647))return {error:"Maximum individuals must be a positive whole number."};
  if(!roles.length||roles.some(r=>!PARTICIPANT_ROLES.includes(r as typeof PARTICIPANT_ROLES[number]))||new Set(roles).size!==roles.length||!roles.some(r=>r.startsWith("player_")))return {error:"Choose valid role slots, including at least one Player slot for the captain."};
  const file=form.get("banner"),remove=text(form,"remove_banner")==="yes";
  if(remove&&file instanceof File&&file.size)return {error:"Choose either a replacement image or removal."};
  let output:Buffer|undefined;
  if(file instanceof File&&file.size){
    if(file.size>5*1024*1024)return {error:"Choose an image no larger than 5 MB."};
    try{output=await prepareBanner(new Uint8Array(await file.arrayBuffer()),file.type);}catch{return {error:"Choose a valid JPEG, PNG or WebP up to 5 MB and 24 megapixels."};}
  }
  if(id&&text(form,"is_active")==="false"){const {data:existing}=await c.from("games").select("is_active").eq("id",id).maybeSingle();if(existing?.is_active&&text(form,"confirm")!=="yes")return {error:"Confirm hiding this game."};}
  let gameId=id;
  let bannerStage:GameBannerStage="reservation",detailsSaved=false;
  try {
    const {data,error}=await c.rpc("admin_save_game_config",{p_title:title,p_slug:slug,p_active:text(form,"is_active")==="true",p_reference:reference||null,p_max:max,p_roles:roles,p_confirm:text(form,"confirm_roster")==="yes",p_id:id||null});
    if(error)return {error:adminError(error.code,error.message)};gameId=data;detailsSaved=true;refresh();
    if(remove){bannerStage="removal";const {error}=await c.rpc("admin_set_game_banner",{p_game:gameId,p_asset:null,p_alt:null});if(error)throw error;}
    else if(output){
      const {data:asset,error}=await c.rpc("admin_reserve_game_banner",{p_game:gameId}).single<{id:string;path:string}>();if(error||!asset)throw error??new Error("Unavailable reservation");
      bannerStage="upload";
      const {error:uploadError}=await c.storage.from("nebula-game-banners").upload(asset.path,output,{contentType:"image/webp",upsert:false,cacheControl:"0"});if(uploadError)throw uploadError;
      bannerStage="attachment";
      const {error:attachError}=await c.rpc("admin_set_game_banner",{p_game:gameId,p_asset:asset.id,p_alt:`${title} game banner`});if(attachError)throw attachError;
    }
    refresh();
    try{await cleanupGameBanners(c);}catch{return {gameId,success:"Game saved. Retry unused game-image cleanup to remove old files."};}
    return {gameId,success:"Game saved. Public competition cards use its current banner."};
  }catch(error){return {gameId:gameId||undefined,error:detailsSaved?gameBannerError(bannerStage,error):"Unable to save the game. Please retry."};}
}
async function cleanupGameBanners(c:Awaited<ReturnType<typeof client>>) {
  for(;;){const {data,error}=await c.rpc("admin_unused_game_banners").limit(100);if(error)throw new Error("cleanup");if(!data?.length)return;
    for(const row of data){const {error:removed}=await c.storage.from("nebula-game-banners").remove([row.path]);if(removed)throw new Error("cleanup");const {data:finished,error:failed}=await c.rpc("admin_finish_game_banner_cleanup",{p_path:row.path});if(failed||finished!==true)throw new Error("cleanup");}}
}
export async function cleanupGameBannersAction():Promise<AdminFormState>{
  const c=await client();try{await cleanupGameBanners(c);return {success:"Unused game images cleaned. Current and shared images are kept."};}catch{return {error:"Some unused game images could not be removed. Retry later."};}
}
export async function deleteGameAction(_state:AdminFormState,form:FormData):Promise<AdminFormState>{
  const c=await client(),id=text(form,"id"),confirmation=form.get("confirmation");
  if(!isUuid(id)||typeof confirmation!=="string")return {error:"Check the game and enter its exact name."};
  const {data:game,error:readError}=await c.from("games").select("title").eq("id",id).maybeSingle();
  if(readError)return {error:"Unable to check this game. Please retry."};
  if(!game)return {error:"This game no longer exists. Refresh the Games tab."};
  if(!exactGameConfirmation(game.title,confirmation))return {error:"Enter the exact current game name."};
  try{const {error}=await c.rpc("admin_delete_game",{p_game:id,p_confirmation:confirmation});if(error)return {error:adminError(error.code,error.message)};}
  catch{return {error:"Unable to confirm deletion. Refresh the Games tab before retrying."};}
  refresh();let notice="game-deleted";
  try{await cleanupGameBanners(c);}catch{notice="game-deleted-cleanup";}
  redirect(`/admin/games?notice=${notice}`);
}
export async function saveCompetitionAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client(); const eventId=text(form,"event_id"), id=text(form,"id");
  if(!isUuid(eventId)||(id&&!isUuid(id))||!isUuid(text(form,"game_id")))return {error:"Select an event and game."};
  const {data:event}=await c.from("events").select("starts_at").eq("id",eventId).maybeSingle();
  const values={game_id:text(form,"game_id"),registration_type:text(form,"registration_type"),starts_at:text(form,"starts_at")?colomboInputToIso(text(form,"starts_at")):event?.starts_at??null,
    registration_opens_at:colomboInputToIso(text(form,"registration_opens_at")),registration_closes_at:colomboInputToIso(text(form,"registration_closes_at")),venue_override:text(form,"venue_override"),registration_fee_lkr:Number(text(form,"registration_fee_lkr")||0),status:text(form,"status")};
  const invalid=validateCompetition(values); if(invalid)return {error:invalid};
  if(!["solo","team"].includes(values.registration_type)||!["scheduled","cancelled"].includes(values.status)||values.venue_override.length>240)return {error:"Check the competition format, venue and status."};
  if(id&&values.status==="cancelled"){const {data:existing}=await c.from("event_games").select("status").eq("id",id).maybeSingle();if(existing?.status==="scheduled"&&text(form,"confirm")!=="yes")return {error:"Confirm cancelling this competition."};}
  try{const {error}=await c.rpc("admin_save_competition",{p_event:eventId,p_values:values,p_id:id||null});if(error)return {error:adminError(error.code,error.message)};}catch{return {error:adminError()};}
  refresh(); return {success:"Competition saved. Existing registrations are preserved."};
}
export async function saveAdminRegistrationAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client(); const competitionId=text(form,"competitionId"), id=text(form,"registrationId"), request=text(form,"requestId");
  if(!isUuid(competitionId)||(id&&!isUuid(id))||(!id&&!isUuid(request)))return {error:"Select a competition and reload the form if needed."};
  let players:PlayerInput[];
  try{const parsed=JSON.parse(text(form,"players"));if(!Array.isArray(parsed)||parsed.some(p=>!p||typeof p!=="object"))return {error:"Check every player's details."};players=parsed;}catch{return {error:"Check every player's details."};}
  const {data:competition}=await c.from("event_games").select("registration_type,game_id").eq("id",competitionId).maybeSingle();if(!competition)return {error:"Competition unavailable."};
  const {data:game,error:gameError}=await c.from("games").select("max_team_size,available_roles").eq("id",competition.game_id).maybeSingle();if(gameError||!game)return {error:"Game roster settings are unavailable. Apply the Phase 6.5 migration."};
  const input={teamName:text(form,"teamName"),clanName:text(form,"clanName"),players};const invalid=validateRegistration(competition.registration_type,input,{maxTeamSize:game.max_team_size,availableRoles:game.available_roles});if(invalid)return {error:invalid};
  let savedId:string;
  try{const {data,error}=await c.rpc("admin_save_registration",{p_competition:competitionId,p_players:players.map(({fullName,ign,gameId,phone,role})=>({fullName,ign,gameId,phone,role:role||null})),p_team:input.teamName||null,p_clan:input.clanName||null,p_registration:id||null,p_request:id?null:request});if(error)return {error:adminError(error.code,error.message)};savedId=data;}catch{return {error:adminError()};}
  refresh();redirect(`/admin/registrations/${savedId}?notice=saved`);
}
export async function cancelAdminRegistrationAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client();const id=text(form,"id");if(!isUuid(id)||text(form,"confirm")!=="yes")return {error:"Confirm cancellation."};
  try{const {error}=await c.rpc("admin_cancel_registration",{p_registration:id});if(error)return {error:adminError(error.code,error.message)};}catch{return {error:adminError()};}
  refresh();return {success:"Registration cancelled. The record and roster are preserved."};
}
export async function changeRoleAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client();const id=text(form,"id"),role=text(form,"role");if(!isUuid(id)||!["admin","player"].includes(role)||text(form,"confirm")!=="yes")return {error:"Choose and confirm the new role."};
  try{const {error}=await c.rpc("admin_change_role",{p_user:id,p_role:role});if(error)return {error:adminError(error.code,error.message)};}catch{return {error:adminError()};}
  refresh();return {success:"Role updated."};
}
async function cleanup(c:Awaited<ReturnType<typeof client>>) {
  for(;;){
    const {data,error}=await c.rpc("admin_unused_banners").limit(100);if(error)throw new Error("cleanup");if(!data?.length)return;
    for(const row of data) {const {error:removeError}=await c.storage.from("nebula-event-banners").remove([row.path]);if(removeError)throw new Error("cleanup");const {data:finished,error:finishError}=await c.rpc("admin_finish_banner_cleanup",{p_path:row.path});if(finishError||finished!==true)throw new Error("cleanup");}
  }
}
export async function cleanupBannersAction():Promise<AdminFormState> {
  const c=await client();try{await cleanup(c);return {success:"Unused banner files cleaned. Recent pending uploads are kept for one hour."};}catch{return {error:"Some unused files could not be removed. Retry cleanup later."};}
}
export async function saveBannerAction(_state:AdminFormState,form:FormData):Promise<AdminFormState> {
  const c=await client(); const eventId=text(form,"event_id");if(!isUuid(eventId))return {error:"Invalid event."};
  try {
    if(text(form,"remove")==="yes") {
      if(text(form,"confirm")!=="yes")return {error:"Confirm banner removal."};
      const {error}=await c.rpc("admin_set_banner",{p_event:eventId,p_asset:null,p_alt:null});if(error)return {error:adminError(error.code,error.message)};
    } else {
      const file=form.get("banner"),alt=text(form,"alt");if(!(file instanceof File)||!file.size)return {error:"Choose an image."};
      if(!alt||alt.length>240)return {error:"Describe the banner in up to 240 characters."};
      let output:Buffer;try{output=await prepareBanner(new Uint8Array(await file.arrayBuffer()),file.type);}catch{return {error:"Choose a valid JPEG, PNG or WebP up to 5 MB and 24 megapixels."};}
      const {data:asset,error:reserveError}=await c.rpc("admin_reserve_banner",{p_event:eventId}).single<{id:string;path:string}>();if(reserveError||!asset)return {error:adminError(reserveError?.code,reserveError?.message)};
      const {error:uploadError}=await c.storage.from("nebula-event-banners").upload(asset.path,output,{contentType:"image/webp",upsert:false,cacheControl:"0"});
      if(uploadError)return {error:"Upload failed. The existing banner is unchanged. Retry or check Storage setup."};
      const {error:attachError}=await c.rpc("admin_set_banner",{p_event:eventId,p_asset:asset.id,p_alt:alt});if(attachError)return {error:"The banner was uploaded but could not be saved. The existing banner is unchanged; cleanup will remove the unused upload."};
    }
    refresh();
    try{await cleanup(c);}catch{return {success:"Banner saved. Retry unused-image cleanup to finish removing old files."};}
    return {success:"Banner saved. Public cards and event pages now use the updated image."};
  }catch{return {error:"Banner service unavailable. Please retry."};}
}
