export const SITE = 'https://sixcentral.co.uk';

/** Absolutise site-relative paths (avatars, media) for native rendering. */
export function absUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  return u.startsWith('/') ? `${SITE}${u}` : u;
}
