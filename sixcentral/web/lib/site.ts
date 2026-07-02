/**
 * Site-wide constants. One place to change, everywhere updates.
 */

/**
 * The Discord invite URL. Set this the moment the server exists
 * (e.g. 'https://discord.gg/xxxxxxx') and every Discord button on the
 * site goes live. While null, the UI shows an honest "opening soon"
 * state that points people at the launch list instead.
 */
export const DISCORD_INVITE: string | null = 'https://discord.gg/8xsC3tymm';

export const SITE_URL = 'https://sixcentral.co.uk';

/**
 * Flip to true once the Discord provider is configured in Supabase
 * (Auth -> Providers -> Discord). Until then the account page offers
 * email magic-link sign-in only.
 */
export const DISCORD_AUTH_READY = process.env.NEXT_PUBLIC_DISCORD_AUTH_READY === 'true';
