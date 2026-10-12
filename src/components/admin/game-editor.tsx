"use client";
import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import type { AdminGame } from "@/lib/admin/data";
import { saveGameAction, type AdminFormState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { GAME_BANNER_FALLBACK } from "@/lib/game-image";
import { PARTICIPANT_ROLES, roleLabel, type ParticipantRole } from "@/lib/registrations/roster-rules";
export function GameEditor({game,existingRosters=[]}:{game?:AdminGame;existingRosters?:{size:number;roles:(string|null)[]}[]}) {
  const [preview,setPreview]=useState<string|null>(null),[fileError,setFileError]=useState(""),[remove,setRemove]=useState(false);
  const [title,setTitle]=useState(game?.title??""),[reference,setReference]=useState(game?.reference_type??""),[active,setActive]=useState(game?.is_active===false?"false":"true");
  const [maximum,setMaximum]=useState(game?.max_team_size?.toString()??""),[roles,setRoles]=useState<readonly ParticipantRole[]>(game?.available_roles??PARTICIPANT_ROLES);
  const [state,action,pending]=useActionState<AdminFormState,FormData>(async(previous:AdminFormState,form:FormData)=>{
    const result=await saveGameAction(previous,form);setPreview(null);setRemove(false);
    return {...result,gameId:result.gameId??previous.gameId};
  },{});
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const affected=existingRosters.filter(r=>r.size>Number(maximum||8)||r.roles.some(role=>role&&!roles.includes(role as ParticipantRole))).length;
  return <form action={action} className="account-form game-editor" onSubmit={e=>{
    if(game?.is_active&&new FormData(e.currentTarget).get("is_active")==="false"&&!window.confirm("Hide this game? Competitions and registrations remain stored, but public registration stops."))e.preventDefault();
  }}>
    <input type="hidden" name="id" value={state.gameId??game?.id??""}/><input type="hidden" name="confirm" value="yes"/>
    <label className="form-field">Game name<input name="title" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} disabled={pending}/></label>
    <label className="form-field">Game Type<select name="reference_type" value={reference} onChange={e=>setReference(e.target.value as "solo"|"team"|"")} disabled={pending}><option value="">Unspecified</option><option value="solo">Solo</option><option value="team">Team</option></select><span className="field-help">Reference only. Each event competition keeps its own registration format.</span></label>
    <fieldset className="game-role-configuration" hidden={reference!=="team"} disabled={pending}>
      <legend>Team roster rules</legend><label className="form-field">Maximum Individuals Per Team<input name="max_team_size" type="number" min={1} max={2147483647} step={1} value={maximum} onChange={e=>setMaximum(e.target.value)} placeholder="Default: 8"/><span className="field-help">Maximum only, including captain, coach and substitutes. Blank uses the default of 8. These rules apply only to Team competitions.</span></label>
      <p className="directory-help">Available participant roles · choose the slots appropriate for this game. At least one Player slot is needed for the captain.</p>
      <div className="game-role-options">{PARTICIPANT_ROLES.map(role=><label key={role}><input type="checkbox" name="available_roles" value={role} checked={roles.includes(role)} onChange={e=>setRoles(current=>e.target.checked?[...current,role]:current.filter(r=>r!==role))}/>{roleLabel(role)}</label>)}</div>
      <p className="directory-help">Each role can be used once. {roles.length} individual role slots are enabled. Teams may leave roles unfilled.</p>
    </fieldset>
    {affected>0&&<div className="form-message form-error"><p>{affected} existing rosters, including historical entries, exceed this maximum or use a removed role. They will remain intact; future edits must meet the new rules.</p><label className="confirmation-check"><input type="checkbox" name="confirm_roster" value="yes" disabled={pending}/><span>I understand and confirm these roster rules.</span></label></div>}
    <label className="form-field">Catalogue visibility<select name="is_active" value={active} onChange={e=>setActive(e.target.value)} disabled={pending}><option value="true">Active</option><option value="false">Hidden · pause public registration</option></select></label>
    <div className="admin-banner-preview"><Image fill unoptimized src={remove?GAME_BANNER_FALLBACK:preview??game?.banner_url??GAME_BANNER_FALLBACK} alt={preview?"Selected game banner preview":game?.banner_alt??"Game banner preview"} sizes="(max-width:760px) 100vw, 600px"/></div>
    <label className="form-field">Game Banner<input type="file" name="banner" accept="image/jpeg,image/png,image/webp" disabled={pending||remove} onChange={e=>{
      const file=e.target.files?.[0];setFileError("");
      if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)){e.target.value="";setPreview(null);setFileError("Choose JPG, PNG or WebP up to 5 MB.");return;}
      setPreview(file?URL.createObjectURL(file):null);
    }}/><span className="field-help">Optional · JPG, PNG or WebP · maximum 5 MB / 24 megapixels. A wide 16:9 image works best. Leave blank to keep the current image.</span></label>
    {game?.banner_url&&<label className="confirmation-check"><input type="checkbox" name="remove_banner" value="yes" checked={remove} disabled={pending} onChange={e=>{setRemove(e.target.checked);setPreview(null);}}/><span>Remove the game banner and use the fallback image.</span></label>}
    {(fileError||state.error)&&<p role="alert" className="form-message form-error">{fileError||state.error}</p>}
    {state.success&&<p role="status" className="form-message form-success">{state.success}</p>}
    <SubmitButton label={game||state.gameId?"Save game":"Add game"} pendingLabel="Saving…"/>
    {!game&&state.gameId&&<a className="text-link" href="/admin/games">Add another game ↗</a>}
  </form>;
}
