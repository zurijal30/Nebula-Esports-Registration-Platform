export function exactEventConfirmation(title:string, value:unknown) {
  return typeof value === "string" && value === title;
}
/** Storage is a separate operation; a failed cleanup must not mask a committed deletion. */
export async function cleanDeletedEventBanners(paths:string[], remove:(path:string)=>Promise<boolean>, finish:(path:string)=>Promise<boolean>) {
  let failed=false;
  for(const path of paths) {
    try { if(!await remove(path)||!await finish(path)) failed=true; } catch { failed=true; }
  }
  return !failed;
}
