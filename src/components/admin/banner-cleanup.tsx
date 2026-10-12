"use client";
import { useActionState } from "react";
import { cleanupBannersAction } from "@/lib/admin/actions";
export function BannerCleanup() {
  const [state,action,pending]=useActionState(cleanupBannersAction,{});
  return <form action={action}><button className="action-link action-secondary" disabled={pending}>{pending?"Cleaning…":"Retry unused-image cleanup"}</button>{state.error&&<p className="form-message form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-message form-success" role="status">{state.success}</p>}</form>;
}
