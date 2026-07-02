# SixCentral — email setup runbook

## 1. The alias register (Google Workspace)

One paid user = the mailbox: **hello@sixcentral.co.uk**. Everything else is a
free alias on it (Admin console → Directory → Users → user → Email aliases).

| Address | Purpose |
|---|---|
| hello@ | The mailbox. Owner identity for Apple/Play/Stripe/Resend/registrar. Supabase sender. |
| support@ | Required on both app store listings; user help. |
| press@ | Media inquiries. |
| partnerships@ | Affiliate managers, newsletter sponsorship inbound. |
| community@ | Moderation, Discord escalations, avatar reports. |
| legal@ | Notice-and-takedown contact (required by the Clip Licence); IP complaints. |
| privacy@ | GDPR data-rights requests. |
| dmarc@ | DMARC report sink. |

To **send as** an alias: Gmail → Settings → Accounts → "Send mail as" → add →
treat as alias (no SMTP details needed for Workspace aliases).
Upgrade path when a second human joins: convert role addresses to Groups.

## 2. DNS — ALL records go in GoDaddy

The domain keeps GoDaddy nameservers (Vercel is pointed at via A/CNAME records
added there), so **GoDaddy's DNS panel is authoritative for everything**:
Google's records, DMARC, and Resend's. Vercel's DNS tab stays untouched.
GoDaddy gotcha: enter record names *without* the domain (e.g. `google._domainkey`,
not `google._domainkey.sixcentral.co.uk`) — GoDaddy appends the domain itself.

- Google MX + SPF: exactly as the Workspace setup wizard shows.
- DKIM: Admin console → Apps → Google Workspace → Gmail → Authenticate email →
  generate → add the TXT → "Start authentication".
- DMARC (root TXT `_dmarc`): `v=DMARC1; p=none; rua=mailto:dmarc@sixcentral.co.uk`
  — tighten to `p=quarantine` once reports look clean for a few weeks.
- Resend records live on a **subdomain** (e.g. send.sixcentral.co.uk), so they
  never conflict with Google's SPF on the root. One SPF per hostname — intact.

## 3. Resend → Supabase SMTP

1. resend.com → Domains → add `sixcentral.co.uk` → copy its records into
   Vercel DNS → wait for Verified.
2. Resend → API Keys → create (sending access).
3. Supabase → Authentication → **SMTP Settings** → enable custom SMTP:
   - Host: `smtp.resend.com`  · Port: `465`
   - Username: `resend`  · Password: *the API key*
   - Sender email: `hello@sixcentral.co.uk` · Sender name: `SixCentral`
4. Authentication → Rate Limits → raise the email-per-hour cap (custom SMTP
   unlocks this; the built-in sender's tiny limit no longer applies).

## 4. Templates

Paste each file from `supabase/templates/` into Supabase → Authentication →
**Emails** (templates), with these subjects:

| Template | File | Subject |
|---|---|---|
| Reset Password | reset-password.html | Reset your SixCentral password |
| Confirm signup | confirm-signup.html | Confirm your SixCentral email |
| Change Email Address | change-email.html | Confirm your new email address |
| Magic Link | magic-link.html | Your SixCentral sign-in link |

(Invite user / Reauthentication see near-zero use — leave defaults or clone the
skeleton if they ever matter.)

## 5. Policy notes

- **Confirm email stays OFF for now** (frictionless signup). Revisit when
  Stripe launches or if signup abuse appears — by then the branded sender makes
  confirmation painless.
- The same verified Resend domain becomes the **newsletter's** sending
  infrastructure later. One setup, two systems.
