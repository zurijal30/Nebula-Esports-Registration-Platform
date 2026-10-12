export type GameBannerStage = "reservation" | "upload" | "attachment" | "removal";
export function gameBannerError(stage:GameBannerStage,error:unknown) {
  const details=error&&typeof error==="object"?error as {code?:unknown;statusCode?:unknown;message?:unknown}:{};
  const value=details.code??details.statusCode;
  // Show a bounded diagnostic code, never raw provider messages, URLs or tokens.
  const code=(typeof value==="string"||typeof value==="number")&&/^[A-Za-z0-9_]{1,24}$/.test(String(value))?String(value):null;
  let hint="Please retry; if it persists, report this step and code.";
  if(code==="PGRST202"||code==="42883"||code==="42P01")hint="The game-banner migration or schema cache is incomplete. Check the new migration in Supabase.";
  else if(code==="42501"||code==="403"||code==="AccessDenied"||code==="Unauthorized")hint="Supabase rejected access. Sign in again as an admin; if it persists, check game-banner Storage policies.";
  else if(code==="404"||code==="NoSuchBucket"||code==="BucketNotFound")hint="Check that the private nebula-game-banners bucket exists.";
  else if(code==="413"||code==="EntityTooLarge")hint="The Storage bucket rejected the image size. Check its 5 MB limit.";
  return `Game details saved, but banner ${stage} failed${code?` (${code})`:""}. The previous image is preserved. ${hint}`;
}
