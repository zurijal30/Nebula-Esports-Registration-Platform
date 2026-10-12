"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteEventAction } from "@/lib/admin/actions";
import { exactEventConfirmation } from "@/lib/admin/event-deletion";
export function DeleteEvent({id,title,competitions,registrations}:{id:string;title:string;competitions:number;registrations:number}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [confirmation,setConfirmation]=useState("");
  const [state,action,pending]=useActionState(deleteEventAction,{});
  useEffect(()=>{const element=dialog.current;return ()=>element?.close();},[]);
  return <><button type="button" className="action-link delete-event-button" onClick={()=>{setConfirmation("");dialog.current?.showModal();}}><Trash2 size={18} aria-hidden="true"/>Delete Event</button>
    <dialog ref={dialog} className="delete-event-dialog" aria-label={`Delete ${title}?`} onCancel={e=>{if(pending)e.preventDefault();}}>
      <h2>Delete {title}?</h2><p>{competitions} game competitions · {registrations} registrations, including cancelled entries.</p>
      <p>This is permanent. The event, its competitions, registrations and associated player records will be removed. Its own uploaded banners will be cleaned up where safe.</p>
      <form action={action}><input type="hidden" name="id" value={id}/><label>Type &quot;{title}&quot; to confirm.<input name="confirmation" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" disabled={pending}/></label>
        {state.error&&<p className="form-message form-error" role="alert">{state.error}</p>}
        <div className="admin-event-actions"><button type="button" className="action-link action-secondary" disabled={pending} onClick={()=>dialog.current?.close()}>Cancel</button><button className="action-link delete-event-button" disabled={pending||!exactEventConfirmation(title,confirmation)}>{pending?"Deleting…":"Permanently Delete Event"}</button></div>
      </form>
    </dialog></>;
}
