// delete-account: Apple 5.1.1(v) in-app account deletion.
// Caller must be signed in. Wipes avatar storage, then deletes the auth user,
// which cascades to profiles and every child table (see migration 0022).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Not signed in" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Storage does not cascade with the auth user, so clear avatar uploads first.
  // Best effort with a hard stop: the auth delete below is the contract.
  try {
    for (let guard = 0; guard < 50; guard++) {
      const { data: files, error } = await admin.storage
        .from("avatars")
        .list(user.id, { limit: 100 });
      if (error || !files || files.length === 0) break;
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: rmErr } = await admin.storage.from("avatars").remove(paths);
      if (rmErr) break;
      if (files.length < 100) break;
    }
  } catch (_e) {
    // swallow: account deletion still proceeds
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("deleteUser failed", delErr.message);
    return json({ error: "Could not delete the account" }, 500);
  }

  return json({ ok: true });
});
