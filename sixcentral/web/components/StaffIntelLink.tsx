"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Drop this anywhere in your logged-in UI (header, nav, profile menu). It shows
// an Intel Desk link only to staff and renders nothing for everyone else, so it
// is safe to place in shared layout. Real access is still enforced by RLS on the
// data, this just controls whether the link appears.
export default function StaffIntelLink() {
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const sb = createClient(url, key);
    let alive = true;
    (async () => {
      const { data } = await sb.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const { data: p } = await sb
        .from("profiles")
        .select("is_staff")
        .eq("id", user.id)
        .maybeSingle();
      if (alive && p?.is_staff) setStaff(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!staff) return null;

  return (
    <a
      href="/staff/intel"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'Spline Sans Mono', monospace",
        fontSize: 13,
        color: "#1FE5D6",
        textDecoration: "none",
        border: "1px solid #1FE5D6",
        borderRadius: 8,
        padding: "6px 12px",
      }}
    >
      Intel Desk
    </a>
  );
}
