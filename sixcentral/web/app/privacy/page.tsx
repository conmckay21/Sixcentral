import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How SixCentral handles your data: what we collect, why, where it lives, and the rights you have over it. Plain English, no tricks.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="kicker">The legal bit, in plain English</div>
        <h1 style={{ marginBottom: 6 }}>Privacy policy</h1>
        <p className="legal__updated">Last updated: 2 July 2026</p>

        <div className="legal">
          <h2>Who we are</h2>
          <p>
            SixCentral is a UK-based fan companion for Grand Theft Auto VI, run from
            sixcentral.co.uk. For anything about your data, email{' '}
            <a href="mailto:privacy@sixcentral.co.uk">privacy@sixcentral.co.uk</a> and a human
            answers. We are not affiliated with Rockstar Games or Take-Two Interactive.
          </p>

          <h2>What we collect</h2>
          <p>
            An account is an email address, a password (stored only as a secure hash) and a
            handle. If you sign in with Discord we also store your Discord ID so your accounts
            link. Everything else on your profile is optional and you choose it: an avatar, a
            bio, your platform, your PSN ID or Xbox Gamertag, and a flair. Your date of birth is
            asked for one thing only: proving you are 18 or over before your gamer IDs can be
            shown publicly. It is never displayed anywhere and nobody but you can see it.
          </p>
          <p>
            Using the community creates data too: contributions you submit, Respect you earn,
            clips you submit or upload, votes and reactions, friendships, and clips friends send
            you. Votes are private to you; only the totals are public. When you join the
            newsletter or agree to the Clip Licence, we store the exact wording you agreed to and
            when, because that record protects you as much as us.
          </p>

          <h2>What we use it for</h2>
          <p>
            Running the service you signed up for: your profile, the leaderboards, the tracker,
            the clips feed, moderation, and keeping cheats off the board. The newsletter is sent
            only if you opted in and every email lets you leave. We do not sell your data, we do
            not run advertising cookies, and we do not profile you for ads. If any of that ever
            changes, this page changes first and asks you first.
          </p>

          <h2>Clips and YouTube</h2>
          <p>
            When you upload a clip, the file sits briefly in private storage, we post it to the
            SixCentral Clips channel on YouTube with your credit, and then we delete our copy.
            From that point the video is hosted by YouTube and Google&rsquo;s own privacy policy
            applies to playback. Clips on our pages use YouTube&rsquo;s privacy-enhanced player.
            You keep ownership of your clip and you can ask us to take it down at any time.
          </p>

          <h2>Who else touches your data</h2>
          <p>
            We use a small set of providers to run SixCentral: Supabase hosts our database and
            sign-in (in the EU, Ireland region), Vercel serves the website, YouTube hosts
            community video, and Discord runs our community server. Like almost every website,
            our hosting keeps short-lived technical logs, which include IP addresses, for
            security. Where a provider processes data outside the UK, recognised safeguards such
            as adequacy decisions or standard contractual clauses apply.
          </p>

          <h2>Cookies</h2>
          <p>
            Essential only. We set what is needed to keep you signed in and nothing else. No
            analytics cookies, no advertising cookies, no banner asking you to accept forty
            partners.
          </p>

          <h2>How long we keep things</h2>
          <p>
            Your data lives as long as your account does. Delete your account and your profile
            and activity are removed with it. Leave the newsletter and your address comes off the
            list. Consent records are kept as legal evidence of the agreement they record. Clips
            stay on the channel until you ask for removal or we retire them.
          </p>

          <h2>Your rights</h2>
          <p>
            UK GDPR gives you the right to see the data we hold on you, correct it, delete it,
            restrict or object to how it is used, and take a copy elsewhere. Email{' '}
            <a href="mailto:privacy@sixcentral.co.uk">privacy@sixcentral.co.uk</a> and we act on
            it. If you think we have handled something badly you can complain to the ICO at
            ico.org.uk, though we would rather you told us first so we can fix it.
          </p>

          <h2>Younger players</h2>
          <p>
            SixCentral is designed with the ICO Children&rsquo;s Code in mind: privacy settings
            default to their safest position, gamer IDs stay private unless an adult chooses
            otherwise, and we collect the minimum we can get away with. The game itself is
            PEGI 18; our editorial keeps that in mind.
          </p>

          <h2>Changes</h2>
          <p>
            When this policy changes, the date at the top changes with it, and anything
            significant gets flagged properly rather than buried.
          </p>
        </div>
      </div>
    </section>
  );
}
