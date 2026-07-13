import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete your account | SixCentral",
  description:
    "How to delete your SixCentral account and what happens to your data when you do.",
};

const PINK = "#FF2E88";
const CYAN = "#1FE5D6";
const BG = "#0B0810";
const TEXT = "#F4F1F8";
const MUTED = "rgba(244, 241, 248, 0.72)";
const SUPPORT_EMAIL = "connor@sixcentral.co.uk";

const h2Style: React.CSSProperties = {
  color: CYAN,
  fontSize: "1.05rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginTop: "2.25rem",
  marginBottom: "0.6rem",
};

const pStyle: React.CSSProperties = {
  color: MUTED,
  lineHeight: 1.65,
  margin: "0 0 0.9rem",
};

export default function DeleteAccountPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: BG,
        color: TEXT,
        padding: "4rem 1.5rem 6rem",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p
          style={{
            color: PINK,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
            margin: 0,
          }}
        >
          SixCentral
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 2.8rem)",
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.05,
            margin: "0.4rem 0 1.2rem",
          }}
        >
          Delete your account
        </h1>
        <p style={pStyle}>
          SixCentral is the GTA 6 companion app, published by SixCentral on the
          App Store and Google Play. This page explains how to delete your
          SixCentral account and what happens to your data when you do.
        </p>

        <h2 style={h2Style}>Delete inside the app</h2>
        <ol style={{ ...pStyle, paddingLeft: "1.25rem" }}>
          <li style={{ marginBottom: "0.35rem" }}>
            Open the SixCentral app and sign in.
          </li>
          <li style={{ marginBottom: "0.35rem" }}>Go to Settings.</li>
          <li>Tap Delete account and confirm.</li>
        </ol>
        <p style={pStyle}>
          Deletion runs immediately. You are signed out and your account is
          gone.
        </p>

        <h2 style={h2Style}>Or request deletion by email</h2>
        <p style={pStyle}>
          Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: PINK }}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the email address on your account with the subject line Delete
          my account. Email requests are actioned within 30 days.
        </p>

        <h2 style={h2Style}>What gets deleted</h2>
        <p style={pStyle}>
          Your login details, your profile (handle, avatar, bio, platform and
          console IDs), your date of birth, your Respect score and rank
          progress, and all content and activity linked to your account.
          Deletion is permanent and Respect cannot be restored.
        </p>

        <h2 style={h2Style}>What we keep</h2>
        <p style={pStyle}>
          Nothing that identifies you. Residual copies in routine encrypted
          backups clear automatically within 30 days. Anonymous server logs may
          persist for up to 90 days and contain no profile data.
        </p>

        <p style={{ ...pStyle, marginTop: "2rem" }}>
          You can create a new account at any time. You start fresh.
        </p>
      </div>
    </main>
  );
}
