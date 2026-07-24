const INDEXNOW_KEY = "523bf5d9133a4ea3a30abfd3b5e24053";
const HOST = "sixcentral.co.uk";

/**
 * Ping IndexNow with one or more paths or absolute URLs.
 * Propagates to Bing (and therefore ChatGPT search), Yandex, Seznam, Naver.
 * Google does not use IndexNow.
 *
 * Never throws and can never hang past 4 seconds, so it is safe to await
 * inside a publish action without risking the publish itself.
 * Call after the DB write succeeds, e.g.
 *   await pingIndexNow(["/news/" + slug, "/news", "/"]);
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const urlList = paths.map((p) => {
    if (p.startsWith("http")) return p;
    return "https://" + HOST + (p.startsWith("/") ? p : "/" + p);
  });

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: "https://" + HOST + "/" + INDEXNOW_KEY + ".txt",
        urlList,
      }),
    });
  } catch {
    // an indexing ping must never break a publish
  }
}
