import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The SixCentral terms: your account, the house rules, the Clip Licence in full, and the honest small print. Plain English throughout.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="kicker">The deal, in plain English</div>
        <h1 style={{ marginBottom: 6 }}>Terms of service</h1>
        <p className="legal__updated">Last updated: 2 July 2026</p>

        <div className="legal">
          <h2>The short version</h2>
          <p>
            SixCentral is a fan-built companion for Grand Theft Auto VI. Be decent, submit only
            what is yours and what is true, and this stays a good place. Use the site and you are
            agreeing to these terms.
          </p>

          <h2>Who we are, and who we are not</h2>
          <p>
            SixCentral is an independent fan project based in the UK. We are not affiliated with,
            endorsed by, or connected to Rockstar Games or Take-Two Interactive. Grand Theft Auto
            and all related names and imagery belong to their owners; we reference them
            descriptively, as fans covering a game.
          </p>

          <h2>Your account</h2>
          <p>
            You need to be 13 or over to hold an account. Keep your sign-in details to yourself,
            pick a handle that will not get you dragged out of a pub, and know that showing your
            gamer IDs publicly is an 18-plus feature that asks for your date of birth first. You
            can delete your account whenever you like and your data goes with it, as described in
            our <a href="/privacy">privacy policy</a>.
          </p>

          <h2>House rules</h2>
          <p>
            No leaked, hacked or stolen material, ever: no 2022-hack footage, no datamined files
            from illegitimate sources, no unreleased builds. Posting it is an instant ban because
            it puts the whole community at legal risk. Beyond that: no abuse or harassment, no
            impersonation, no spam, nothing illegal, and no gaming the Respect system with fake
            accounts, vote rings or fabricated finds. Moderators can reject, remove or reverse
            anything that breaks these rules, and repeat or serious breaches end accounts.
          </p>

          <h2>Contributions and Respect</h2>
          <p>
            Contributions earn Respect only when a moderator or trusted member verifies them.
            That gate is the whole point of SixCentral, so accept that some submissions get
            rejected and some verdicts will not go your way. Respect, ranks, flair and titles are
            reputation inside SixCentral: they have no cash value, cannot be sold or transferred,
            and can be adjusted or removed to fix errors or abuse.
          </p>

          <h2 id="clips">The Clip Licence</h2>
          <p>
            This is the full version of the licence you agree to when submitting a clip. You must
            own the clip or hold the rights to it, and it must not contain leaked or unlawful
            material. You keep ownership. It is your clip, always. You grant SixCentral a
            non-exclusive, worldwide, royalty-free licence to host it (including on the
            SixCentral Clips YouTube channel when you upload the file to us), to feature it on
            the site, in the app, in Clip of the Month, and in weekly best-of compilations, and
            to show it in previews and thumbnails. We credit you and link your channel wherever
            it appears. Ask us to remove it at any time by emailing{' '}
            <a href="mailto:legal@sixcentral.co.uk">legal@sixcentral.co.uk</a> or through your
            account, and we take it down from our surfaces and our channel within a reasonable
            time. Clips are human-moderated before they appear anywhere.
          </p>

          <h2>Our content</h2>
          <p>
            The words, original artwork, design and code of SixCentral are ours. Quote us with
            credit and a link, and we will get along fine. Do not scrape the site wholesale or
            republish our guides as your own.
          </p>

          <h2>The honest small print</h2>
          <p>
            SixCentral is provided as it is, free at the point of use, by a small team doing its
            best. We do not guarantee the site will always be up, that every fact survives a
            patch, or that features arrive on any particular date. To the extent the law allows,
            we are not liable for losses arising from use of the site. Nothing in these terms
            limits liability that cannot legally be limited, and nothing here reduces your
            statutory rights.
          </p>

          <h2>Changes and endings</h2>
          <p>
            We can update these terms, and when we do the date above changes and significant
            changes get flagged properly. We can suspend or close accounts that break the rules.
            You can leave any time.
          </p>

          <h2>The boring but necessary line</h2>
          <p>
            These terms are governed by the law of England and Wales, and the courts of England
            and Wales have jurisdiction. Questions to{' '}
            <a href="mailto:legal@sixcentral.co.uk">legal@sixcentral.co.uk</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
