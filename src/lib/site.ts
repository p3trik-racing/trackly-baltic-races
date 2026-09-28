/** Canonical public site URL — used for QR codes, share links and link previews so preview/domain differences never leak. */
export const SITE_URL = "https://majorkaracing.com";

export function absoluteAsset(path: string) {
  if (/^https:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
