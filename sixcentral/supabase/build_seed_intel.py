#!/usr/bin/env python3
"""Generate seed_intel_20260706.sql from a clean data structure.

Rich, ranked GTA 6 stories captured on 6 July 2026, so the Intel Desk opens
populated as article fuel. Scoring mirrors web/lib/intel/engine.ts. Re-run this
to regenerate the SQL; it uses INSERT ... ON CONFLICT DO NOTHING so applying it
twice is harmless and never clobbers your edits.
"""

import json
from datetime import datetime, timezone

REF = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)

TIER_BASE = {1: 45, 2: 32, 3: 18, 4: 8}
CAT_BOOST = {"debunk": 8, "controversy": 6, "confirmed": 4, "leak": 2, "rumour": 0}


def clamp(n, lo=0.0, hi=100.0):
    return max(lo, min(hi, n))


def score(tier, spread, corroborated, category, published):
    strength = clamp(TIER_BASE.get(tier, 8) + (20 if corroborated else 0) + min(spread, 10) * 1.5)
    pub = datetime.fromisoformat(published).replace(tzinfo=timezone.utc)
    hours_old = max(0.0, (REF - pub).total_seconds() / 3600.0)
    recency = clamp(100 - hours_old * 1.2)
    spread_score = clamp(min(spread, 15) * 6)
    boost = CAT_BOOST.get(category, 0)
    rank = round(strength * 0.35 + spread_score * 0.3 + recency * 0.25 + boost, 1)
    return round(strength, 1), rank


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def qj(obj):
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def src(outlet, url, date):
    return {"outlet": outlet, "url": url, "published_at": date + "T12:00:00Z"}


ITEMS = [
    {
        "fp": "seed-release-date-nov-19",
        "title": "GTA 6 release date locked to 19 November 2026, reaffirmed on the Take-Two earnings call",
        "category": "confirmed", "call": "run", "tier": 1, "spread": 12,
        "corroborated": True, "origin": "Rockstar Games / Take-Two", "published": "2026-05-21",
        "summary": "Rockstar and Take-Two have held the 19 November 2026 launch date. It was reaffirmed on the 21 May earnings call and is baked into Take-Two full-year FY27 guidance of roughly 8 to 8.2 billion dollars. The game ships on PS5 and Xbox Series X and S, with no PC date given. This is the anchor fact every SixCentral countdown, guide and news piece should key off, and the strongest confirmed-over-rumour foundation you have.",
        "key_points": [
            "Launch date 19 November 2026 on PS5 and Xbox Series X and S",
            "Reaffirmed on the 21 May 2026 Take-Two earnings call",
            "Baked into Take-Two FY27 guidance of about 8 to 8.2 billion dollars",
            "No PC release date given",
        ],
        "sources": [
            src("Variety", "https://variety.com/2026/gaming/news/gta-5-no-delay-price-marketing-summer-1236755303/", "2026-05-21"),
            src("TechTimes", "https://www.techtimes.com/articles/317156/20260525/gta-6-release-date-locked-pre-orders-trailer-3-expected-late-june.htm", "2026-05-25"),
            src("GamesRadar", "https://www.gamesradar.com/gta-6-guide/", "2026-05-22"),
            src("Wikipedia", "https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI", "2026-05-22"),
        ],
    },
    {
        "fp": "seed-preorders-live-pricing",
        "title": "GTA 6 pre-orders live since 25 June, Standard 79.99 dollars and Ultimate around 100 dollars",
        "category": "confirmed", "call": "run", "tier": 1, "spread": 9,
        "corroborated": True, "origin": "Rockstar Games", "published": "2026-06-25",
        "summary": "Pre-orders opened on 25 June. The Standard edition is 79.99 dollars, with an Ultimate edition around 100 dollars and a Vintage Vice City pre-order bonus. Confirm the pound pricing against the local storefront before publishing. This is confirmed retail detail and a natural buying-guide update.",
        "key_points": [
            "Pre-orders opened 25 June 2026",
            "Standard 79.99 dollars, Ultimate around 100 dollars",
            "Vintage Vice City pre-order bonus",
            "Confirm GBP pricing on the local storefront before publishing",
        ],
        "sources": [
            src("TechTimes", "https://www.techtimes.com/articles/317156/20260525/gta-6-release-date-locked-pre-orders-trailer-3-expected-late-june.htm", "2026-06-25"),
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-06-25"),
            src("GamesRadar", "https://www.gamesradar.com/gta-6-guide/", "2026-06-25"),
        ],
    },
    {
        "fp": "seed-physical-no-disc",
        "title": "Physical edition ships as a download code in a box with no disc",
        "category": "controversy", "call": "run", "tier": 2, "spread": 5,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "The boxed physical edition contains a download code rather than a game disc, which has drawn criticism around ownership and resale. It ties into the wider digital-only debate and is strong controversy material framed around what buyers actually get for their money.",
        "key_points": [
            "Boxed edition contains a download code, not a disc",
            "Criticism centred on ownership and resale",
            "Feeds the wider digital-only debate",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
            src("GamingBible", "https://www.gamingbible.com/news/gta-6-2026-release-schedule-318100-20260603", "2026-06-30"),
        ],
    },
    {
        "fp": "seed-trailer-3-window",
        "title": "Trailer 3 did not land with pre-orders, now widely expected mid-July around the World Cup final",
        "category": "rumour", "call": "analysis", "tier": 2, "spread": 12,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-02",
        "summary": "Trailer 3 did not drop alongside pre-orders, which is now a confirmed non-event. Coverage across many outlets points to a mid-July window, with several tips clustering around the World Cup final on 19 July. As of early July nothing had been released. This is a live watch item, ideal for an evergreen updated when is Trailer 3 coming piece with a clear confirmed versus expected split.",
        "key_points": [
            "Trailer 3 was not released with pre-orders",
            "Multiple outlets point to a mid-July window",
            "Several tips cluster around the World Cup final on 19 July",
            "Nothing released as of early July",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/when-is-gta-6-trailer-3-coming-the-window-is-clearer-19a0", "2026-07-02"),
            src("ComicBook", "https://comicbook.com/gaming/news/gta-6-trailer-release-date-july/", "2026-07-01"),
            src("Insider Gaming", "https://insider-gaming.com/when-is-gta-6-trailer-3-releasing-june-2026-update/", "2026-06-30"),
            src("VICE", "https://www.vice.com/en/article/when-is-gta-6-trailer-3-releasing-rumored-date-hints/", "2026-07-01"),
            src("Beebom", "https://beebom.com/when-will-gta-6-trailer-3-come-out/", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-ned-luke-sarcasm",
        "title": "Ned Luke wouldn't that be nice remark was sarcasm, not a Michael return confirmation",
        "category": "debunk", "call": "debunk", "tier": 2, "spread": 6,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "A viral clip framed Ned Luke as confirming Michael returns for GTA 6. In context his wouldn't that be nice line was sarcasm, not confirmation, and nothing official supports a Michael appearance. This is a clean debunk and exactly the confirmed-over-rumour correction SixCentral should own.",
        "key_points": [
            "Viral clip claimed Michael is confirmed to return",
            "Ned Luke's remark was sarcasm, read out of context",
            "No official support for a Michael appearance",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-melenchon-digital",
        "title": "French politician Melenchon cites digital-only launch in a game-ownership debate",
        "category": "controversy", "call": "run", "tier": 2, "spread": 4,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "French political figure Jean-Luc Melenchon referenced the digital-only direction of the launch in a wider argument about game ownership and preservation. It pushes the digital-only story out of gaming media and into mainstream politics, a strong angle on what always-digital means for buyers.",
        "key_points": [
            "Melenchon referenced the digital-only launch",
            "Framed around game ownership and preservation",
            "Moves the story into mainstream political debate",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-60fps-doubts",
        "title": "Doubts over a locked 60fps launch raised by Digital Foundry and an ex-Rockstar animator",
        "category": "controversy", "call": "analysis", "tier": 2, "spread": 4,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "Technical analysis from Digital Foundry and comments attributed to a former Rockstar animator have raised doubts about whether the console launch will hit a locked 60fps. Nothing is confirmed on final performance. A measured performance explainer that separates analysis from confirmation fits the brand well.",
        "key_points": [
            "Digital Foundry raised 60fps doubts",
            "An ex-Rockstar animator added to the doubt",
            "Final performance is unconfirmed",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-scalpers-codes",
        "title": "Scalpers reselling 79.99 dollar digital codes for 120 to 138 dollars",
        "category": "controversy", "call": "analysis", "tier": 3, "spread": 3,
        "corroborated": False, "origin": "GTA BOOM", "published": "2026-07-02",
        "summary": "Reports describe resellers listing digital pre-order codes on eBay at roughly 120 to 138 dollars against the 79.99 dollar retail price. It is a marketplace-driven story worth verifying against live listings before publishing, and a useful consumer-awareness angle.",
        "key_points": [
            "Digital codes listed at about 120 to 138 dollars",
            "Retail price is 79.99 dollars",
            "Verify against live listings before publishing",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-02"),
        ],
    },
    {
        "fp": "seed-sony-disc-2028",
        "title": "Sony reported to end PS5 disc production in January 2028",
        "category": "controversy", "call": "analysis", "tier": 2, "spread": 3,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "Reporting indicates Sony will wind down PS5 disc production in January 2028. It is adjacent to the GTA 6 no-disc story and useful context for any physical versus digital piece, though it is a platform-level trend rather than a GTA-specific fact.",
        "key_points": [
            "Sony reported to end PS5 disc production in January 2028",
            "Adjacent context to the GTA 6 no-disc story",
            "Platform trend, not GTA-specific",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-fake-gaming-contract",
        "title": "Viral GTA 6 gaming contract is fake and not legally binding",
        "category": "debunk", "call": "debunk", "tier": 3, "spread": 3,
        "corroborated": False, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "A viral so-called GTA 6 gaming contract circulating on social media is fabricated and carries no legal weight. Flagging it as fake is a quick, on-brand debunk that protects readers from a shareable hoax.",
        "key_points": [
            "A viral gaming contract is circulating",
            "It is fabricated and not legally binding",
            "Quick debunk to flag as fake",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-switch2-port",
        "title": "Switch 2 port claimed by insider Nash Weedle, unconfirmed",
        "category": "rumour", "call": "hold", "tier": 3, "spread": 3,
        "corroborated": False, "origin": "GTAVI Spot", "published": "2026-06-28",
        "summary": "Insider Nash Weedle has claimed a Nintendo Switch 2 port is in the works. There is no official confirmation, and Rockstar has only committed to PS5 and Xbox Series X and S. Treat strictly as an unverified insider claim with heavy caveats.",
        "key_points": [
            "Insider Nash Weedle claims a Switch 2 port",
            "No official confirmation",
            "Rockstar has only committed to PS5 and Xbox Series X and S",
        ],
        "sources": [
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-06-28"),
            src("Beebom", "https://beebom.com/gta-6-release-date-gameplay-characters-maps-leaks-rumors-more/", "2026-06-27"),
        ],
    },
    {
        "fp": "seed-20min-gameplay-trailer",
        "title": "Claim of a 20 minute gameplay trailer sourced to a DarkViperAU I know a guy remark",
        "category": "rumour", "call": "hold", "tier": 4, "spread": 2,
        "corroborated": False, "origin": "GTAVI Spot", "published": "2026-06-30",
        "summary": "A claim that a long, roughly 20 minute gameplay trailer is coming traces back to an offhand I know a guy remark from streamer DarkViperAU. The sourcing is weak and unverified. Worth logging only so you can counter it if it spreads.",
        "key_points": [
            "Claim of a 20 minute gameplay trailer",
            "Sourced to an offhand DarkViperAU remark",
            "Weak, unverified sourcing",
        ],
        "sources": [
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-06-30"),
        ],
    },
    {
        "fp": "seed-lucia-jason-artwork",
        "title": "Lucia and Jason 3 artwork filename spotted on Rockstar site, possible Trailer 3 thumbnail",
        "category": "rumour", "call": "analysis", "tier": 3, "spread": 3,
        "corroborated": False, "origin": "GTAVI Spot", "published": "2026-07-02",
        "summary": "Community members spotted a Lucia and Jason 3 artwork filename referenced on Rockstar infrastructure, read by some as a hint at a third piece of key art or a Trailer 3 thumbnail. It is a filename observation, not an announcement, and should be framed as an interesting breadcrumb rather than confirmation.",
        "key_points": [
            "A Lucia and Jason 3 artwork filename was spotted",
            "Read as a possible third key art or Trailer 3 thumbnail",
            "A filename clue, not an announcement",
        ],
        "sources": [
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-07-02"),
            src("GamerMarkt", "https://www.gamermarkt.com/blog/gta-6-all-characters-confirmed-full-list/", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-75hr-5-chapters",
        "title": "Leak claims a 75 hour story across five chapters",
        "category": "leak", "call": "hold", "tier": 3, "spread": 2,
        "corroborated": False, "origin": "GTAVI Spot", "published": "2026-06-28",
        "summary": "A leak claims the main story runs around 75 hours across five chapters. It is unverified and Rockstar has said nothing about story length. Log it as a leak with clear caveats. SixCentral links out to datamine coverage rather than hosting it.",
        "key_points": [
            "Leak claims a roughly 75 hour story",
            "Structured across five chapters",
            "Unverified, no official word on length",
        ],
        "sources": [
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-06-28"),
        ],
    },
    {
        "fp": "seed-amazon-br-listing",
        "title": "Amazon Brazil listing briefly leaked feature and map details",
        "category": "leak", "call": "hold", "tier": 2, "spread": 3,
        "corroborated": False, "origin": "Dexerto", "published": "2026-07-01",
        "summary": "An Amazon Brazil product listing briefly exposed feature bullet points covering dynamic weather, map and social-media style details before being pulled. Retail listings can carry placeholder or inaccurate copy, so treat specifics with caution and link out to the coverage rather than restating leaked marketing as fact.",
        "key_points": [
            "An Amazon Brazil listing briefly leaked feature bullets",
            "Included dynamic weather and map style details",
            "Retail listings can carry placeholder copy, treat with caution",
        ],
        "sources": [
            src("Dexerto", "https://www.dexerto.com/gta/amazon-gta-6-page-leaks-gta-6-gameplay-features-map-details-dynamic-weather-social-media-more-3379716/", "2026-07-01"),
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-leaks-locked-fakes",
        "title": "Report says genuine GTA 6 leaks are locked down while fakes are being seeded",
        "category": "leak", "call": "analysis", "tier": 2, "spread": 3,
        "corroborated": True, "origin": "GTAVI Spot", "published": "2026-07-02",
        "summary": "Coverage suggests genuine information is tightly controlled this cycle and that deliberately fake leaks are circulating, making verification harder than usual. This is an ideal meta angle for SixCentral: a piece on why the confirmed-over-rumour approach matters most exactly when the leak environment is being polluted.",
        "key_points": [
            "Genuine information is tightly controlled this cycle",
            "Fake leaks are reportedly being seeded",
            "Verification is harder than usual, a strong meta angle",
        ],
        "sources": [
            src("GTAVI Spot", "https://www.gtavispot.com/news/gta-6-leaks/", "2026-07-02"),
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-02"),
        ],
    },
    {
        "fp": "seed-shareholders-price",
        "title": "Take-Two shareholders reportedly wanted a higher price than 79.99 dollars",
        "category": "controversy", "call": "analysis", "tier": 2, "spread": 3,
        "corroborated": True, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "Reporting suggests some Take-Two shareholders were disappointed the Standard price was not set higher than 79.99 dollars. It is a business and pricing angle that contrasts investor appetite with player reaction to premium pricing.",
        "key_points": [
            "Some shareholders reportedly wanted a higher price",
            "Standard price is 79.99 dollars",
            "Investor appetite versus player reaction",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/gta-6-news-7d1f", "2026-07-01"),
        ],
    },
    {
        "fp": "seed-july14-online-dlc",
        "title": "Datamine points to a 14 July GTA Online update",
        "category": "leak", "call": "hold", "tier": 3, "spread": 2,
        "corroborated": False, "origin": "GTA BOOM", "published": "2026-07-01",
        "summary": "A datamine points to a GTA Online update landing around 14 July. It is GTA Online rather than GTA 6, but the date has fed Trailer 3 timing speculation. Log as a leak and keep it separate from GTA 6 confirmed facts.",
        "key_points": [
            "Datamine points to a 14 July GTA Online update",
            "Relates to GTA Online, not GTA 6",
            "Date has fed Trailer 3 timing talk",
        ],
        "sources": [
            src("GTA BOOM", "https://www.gtaboom.com/why-gta-6-trailer-3-probably-comes-before-july-14-c247", "2026-07-01"),
        ],
    },
]


def main():
    out = []
    out.append("-- SixCentral Intel Desk seed. Generated by build_seed_intel.py.")
    out.append("-- Real GTA 6 stories captured 6 July 2026, scored to match the live engine.")
    out.append("-- Safe to run more than once (ON CONFLICT DO NOTHING). Apply AFTER the migration.")
    out.append("")
    cols = ("fingerprint, title, summary, key_points, origin, source_tier, spread_count, "
            "sources, corroborated, strength_score, rank_score, auto_category, category, "
            "editorial_call, status, published_at")
    for it in ITEMS:
        strength, rank = score(it["tier"], it["spread"], it["corroborated"], it["category"], it["published"])
        pub = it["published"] + "T12:00:00Z"
        vals = [
            q(it["fp"]),
            q(it["title"]),
            q(it["summary"]),
            qj(it["key_points"]),
            q(it["origin"]),
            str(it["tier"]),
            str(it["spread"]),
            qj(it["sources"]),
            "true" if it["corroborated"] else "false",
            str(strength),
            str(rank),
            q(it["category"]),
            q(it["category"]),
            q(it["call"]),
            "'new'",
            q(pub),
        ]
        out.append(f"insert into intel_items ({cols})")
        out.append("values (" + ", ".join(vals) + ")")
        out.append("on conflict (fingerprint) do nothing;")
        out.append("")
    sql = "\n".join(out)
    with open("seed_intel_20260706.sql", "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"Wrote seed_intel_20260706.sql with {len(ITEMS)} stories.")


if __name__ == "__main__":
    main()
