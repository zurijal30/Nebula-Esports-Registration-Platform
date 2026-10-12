import sharp from "sharp";
import { MAX_BANNER_BYTES } from "../game-image.ts";
export { MAX_BANNER_BYTES } from "../game-image.ts";
export async function prepareBanner(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length>MAX_BANNER_BYTES) throw new Error("Choose an image no larger than 4 MB.");
  const expected: Record<string,string> = {"image/jpeg":"jpeg","image/png":"png","image/webp":"webp"};
  if (!expected[mime]) throw new Error("Choose a JPEG, PNG or WebP image.");
  const decoder = sharp(bytes, {limitInputPixels:24_000_000,failOn:"error",animated:false});
  const meta = await decoder.metadata();
  if (meta.format!==expected[mime] || !meta.width || !meta.height || (meta.pages ?? 1)>1) throw new Error("The file content must match a non-animated JPEG, PNG or WebP image.");
  // Full decode/re-encode rejects corrupt payloads and strips original metadata.
  const output = await decoder.rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).webp({quality:85}).toBuffer();
  if (output.length>MAX_BANNER_BYTES) throw new Error("The processed image is too large. Choose a smaller image.");
  return output;
}
