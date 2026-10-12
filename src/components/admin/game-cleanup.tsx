"use client";
import { useActionState } from "react";
import { cleanupGameBannersAction } from "@/lib/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
export function GameCleanup(){const [state,action]=useActionState(cleanupGameBannersAction,{});return <form action={action} className="admin-cleanup"><p className="directory-help">Game-image cleanup keeps all current and shared images. Unfinished uploads are kept for one hour.</p>{state.error&&<p role="alert" className="form-message form-error">{state.error}</p>}{state.success&&<p role="status" className="form-message form-success">{state.success}</p>}<SubmitButton label="Clean unused game images"/></form>;}
