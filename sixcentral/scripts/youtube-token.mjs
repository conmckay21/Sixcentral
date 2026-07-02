/**
 * One-time: mint the SixCentral channel's refresh token.
 * Run:  YT_CLIENT_ID=... YT_CLIENT_SECRET=... node scripts/youtube-token.mjs
 * Then sign in AS THE SIXCENTRAL CHANNEL'S GOOGLE ACCOUNT in the browser
 * window it opens, and paste the printed refresh token into Vercel env.
 */
import http from 'node:http';

const ID = process.env.YT_CLIENT_ID;
const SECRET = process.env.YT_CLIENT_SECRET;
if (!ID || !SECRET) {
  console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET.');
  process.exit(1);
}
const REDIRECT = 'http://localhost:8788/callback';
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:8788');
    if (url.pathname !== '/callback') return res.end();
    const code = url.searchParams.get('code');
    const tok = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: ID,
        client_secret: SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    }).then((r) => r.json());
    res.end('Done. Check the terminal, then close this tab.');
    console.log('\nYOUTUBE_REFRESH_TOKEN =', tok.refresh_token ?? '(missing: remove app access at myaccount.google.com/permissions and rerun)');
    process.exit(0);
  })
  .listen(8788, () => {
    console.log('Open this in a browser and sign in as the SixCentral channel account:\n\n' + authUrl + '\n');
  });
