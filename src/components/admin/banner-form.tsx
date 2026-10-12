"use client";
import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { saveBannerAction, cleanupBannersAction } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { MAX_BANNER_BYTES } from "@/lib/game-image";
export function BannerForm({eventId, current, alt}:{eventId:string;current:string|null;alt:string}) {
  const [preview,setPreview]=useState<{url:string;base:string|null}|null>(null);
  const [fileError,setFileError]=useState("");
  const [state,action,pending]=useActionState(saveBannerAction,{});
  const [cleanupState,cleanupAction]=useActionState(cleanupBannersAction,{});
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
  const selected=preview?.base===current?preview?.url:null;
  return <div className="admin-banner-manager"><form action={action} className="account-form">
    <input type="hidden" name="event_id" value={eventId}/>
    <div className="admin-banner-preview"><Image fill unoptimized src={selected??current??"/images/events/default-banner.svg"} alt={selected?"Selected banner preview":alt} sizes="(max-width:760px) 100vw, 600px"/></div>
    <label className="form-field">Upload / replace image<input type="file" name="banner" accept="image/jpeg,image/png,image/webp" required disabled={pending} onChange={e=>{const file=e.target.files?.[0];setFileError("");if(file&&file.size>MAX_BANNER_BYTES){e.target.value="";setPreview(null);setFileError("Choose an image no larger than 4 MB.");return;}setPreview(file?{url:URL.createObjectURL(file),base:current}:null);}}/><span className="field-help">JPEG, PNG or WebP · maximum 4 MB / 24 megapixels. Images are decoded and saved as WebP.</span></label>
    <label className="form-field">Image description<input name="alt" required maxLength={240} defaultValue={alt} disabled={pending}/></label>
    {(fileError||state.error)&&<p role="alert" className="form-message form-error">{fileError||state.error}</p>}{state.success&&<p role="status" className="form-message form-success">{state.success}</p>}
    <SubmitButton label="Save banner" pendingLabel="Uploading…"/>
  </form>
  {current&&<BannerRemoval eventId={eventId}/>}
  <form action={cleanupAction} className="admin-cleanup"><p className="directory-help">Cleanup removes replaced files and unfinished uploads older than one hour. Current event images are kept.</p>{cleanupState.error&&<p role="alert" className="form-message form-error">{cleanupState.error}</p>}{cleanupState.success&&<p role="status" className="form-message form-success">{cleanupState.success}</p>}<SubmitButton label="Clean unused images"/></form>
  </div>;
}
function BannerRemoval({eventId}:{eventId:string}) {
  const [state,action,pending]=useActionState(saveBannerAction,{});
  return <form action={action} className="admin-remove-banner"><input type="hidden" name="event_id" value={eventId}/><input type="hidden" name="remove" value="yes"/><label className="confirmation-check"><input type="checkbox" name="confirm" value="yes" required disabled={pending}/><span>Remove the current event image and use the default banner.</span></label>{state.error&&<p role="alert" className="form-message form-error">{state.error}</p>}{state.success&&<p role="status" className="form-message form-success">{state.success}</p>}<SubmitButton label="Remove banner"/></form>;
}
