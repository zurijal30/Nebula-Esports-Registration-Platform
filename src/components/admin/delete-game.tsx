"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteGameAction } from "@/lib/admin/actions";
import { canDeleteGame } from "@/lib/admin/game-policy";
export function DeleteGame({id,title,references}:{id:string;title:string;references:number}){
  const dialog=useRef<HTMLDialogElement>(null),[confirmation,setConfirmation]=useState("");
  const [state,action,pending]=useActionState(deleteGameAction,{});
  useEffect(()=>{const element=dialog.current;return()=>element?.close();},[]);
  return <><button type="button" className="action-link delete-event-button" onClick={()=>{setConfirmation("");dialog.current?.showModal();}}><Trash2 size={18} aria-hidden="true"/>Delete Game</button>
    <dialog ref={dialog} className="delete-event-dialog" aria-label={`Delete ${title}?`} onCancel={e=>{if(pending)e.preventDefault();}}>
      <h2>Delete {title}?</h2><p>{references} event competitions reference this game, including past and cancelled competitions.</p>
      <p>{references?"Permanent deletion is blocked because this game is used by existing tournament records. You can hide it instead.":"Deletion is permanent. Only this unused game is removed. Its own unused banner files are cleaned up where safe."}</p>
      <form action={action}><input type="hidden" name="id" value={id}/><label>Type &quot;{title}&quot; to confirm.<input name="confirmation" value={confirmation} autoComplete="off" disabled={pending||references>0} onChange={e=>setConfirmation(e.target.value)}/></label>
        {state.error&&<p role="alert" className="form-message form-error">{state.error}</p>}
        <div className="admin-event-actions"><button type="button" className="action-link action-secondary" disabled={pending} onClick={()=>dialog.current?.close()}>Cancel</button><button className="action-link delete-event-button" disabled={pending||!canDeleteGame(title,confirmation,references)}>{pending?"Deleting…":"Permanently Delete Game"}</button></div>
      </form>
    </dialog></>;
}
