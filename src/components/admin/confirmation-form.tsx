"use client";
import { useActionState, useState } from "react";
import type { AdminFormState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
export function ConfirmationForm({action:save,hidden,label,message}:{action:(state:AdminFormState,form:FormData)=>Promise<AdminFormState>;hidden:Record<string,string>;label:string;message:string}) {
  const [open,setOpen]=useState(false);
  const [state,action,pending]=useActionState(async(previous:AdminFormState,form:FormData)=>{const result=await save(previous,form);if(result.success)setOpen(false);return result;},{});
  return <div>{!open?<>{state.success&&<p role="status" className="form-message form-success">{state.success}</p>}<button className="action-link action-secondary" type="button" onClick={()=>setOpen(true)}>{label}</button></>:<form action={action} className="cancel-confirmation">
    {Object.entries(hidden).map(([k,v])=><input type="hidden" key={k} name={k} value={v}/>)}<input type="hidden" name="confirm" value="yes"/>
    <p>{message}</p>{state.error&&<p role="alert" className="form-message form-error">{state.error}</p>}{state.success&&<p role="status" className="form-message form-success">{state.success}</p>}
    <div className="registration-controls"><SubmitButton label={`Confirm ${label.toLowerCase()}`}/><button type="button" disabled={pending} className="cancel-link" onClick={()=>setOpen(false)}>Go back</button></div>
  </form>}</div>;
}
