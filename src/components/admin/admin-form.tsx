"use client";
import { useActionState, useState } from "react";
import type { AdminFormState } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
export interface AdminField { name:string;label:string;type?:"text"|"textarea"|"datetime-local"|"number"|"select";value?:string;required?:boolean;maxLength?:number;readOnly?:boolean;options?:{value:string;label:string}[];help?:string }
export function AdminForm({ fields, hidden = {}, action:save, label="Save", confirmWhen }: {
  fields:AdminField[];hidden?:Record<string,string>;action:(state:AdminFormState,form:FormData)=>Promise<AdminFormState>;label?:string;
  confirmWhen?:{field:string;value:string;message:string}[];
}) {
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(fields.map(f=>[f.name,f.value??""])));
  const [state,action,pending]=useActionState(save,{});
  const confirmations=confirmWhen?.filter(rule=>values[rule.field]===rule.value);
  return <form action={action} className="admin-form account-form">
    {Object.entries(hidden).map(([key,value])=><input key={key} type="hidden" name={key} value={value} />)}
    <fieldset disabled={pending} className="admin-form-fields">{fields.map(field=><label className="form-field" key={field.name}>
      <span>{field.label}{field.required&&" *"}</span>
      {field.type==="textarea"?<textarea name={field.name} value={values[field.name]} onChange={e=>setValues(v=>({...v,[field.name]:e.target.value}))} required={field.required} maxLength={field.maxLength} rows={5}/>
      :field.type==="select"?<><select name={field.name} disabled={field.readOnly} required={field.required} value={values[field.name]} onChange={e=>setValues(v=>({...v,[field.name]:e.target.value}))}>{field.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>{field.readOnly&&<input type="hidden" name={field.name} value={values[field.name]}/>}</>
      :<input name={field.name} type={field.type??"text"} value={values[field.name]} onChange={e=>setValues(v=>({...v,[field.name]:e.target.value}))} readOnly={field.readOnly} required={field.required} maxLength={field.maxLength} min={field.type==="number"?0:undefined} step={field.type==="number"?"0.01":undefined}/>}
      {field.help&&<span className="field-help">{field.help}</span>}
    </label>)}</fieldset>
    {!!confirmations?.length&&<label className="confirmation-check"><input type="checkbox" name="confirm" value="yes" required disabled={pending}/><span>{confirmations.map(c=>c.message).join(" ")}</span></label>}
    {state.error&&<p className="form-message form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-message form-success" role="status">{state.success}</p>}
    <SubmitButton label={label} pendingLabel="Saving…"/>
  </form>;
}
