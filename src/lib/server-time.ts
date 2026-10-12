import { connection } from "next/server";

/** Read the clock after a request arrives, rather than during prerendering. */
export async function getRequestNow() {
  await connection();
  return Date.now();
}
