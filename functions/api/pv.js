// 页面访问追踪
// 设计：单条 INSERT 写入，无 read-modify-write 竞态
// 隐私：只存 IP hash，不存原始 IP/User-Agent
// 去重：同 hash + 同 URL 30 分钟内只算一次
export async function onRequest(context) {
  const { request, env } = context;
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };

  // 只接受 POST，防爬虫 GET 暴刷
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: h });
  }

  try {
    const body = await request.json();
    let url = String(body.url || "/").slice(0, 500);
    if (!url.startsWith("/")) url = "/";

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    // IP hash：SHA-256 截 16 字符，足够去重又不可还原
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(ip + "::bankai"));
    const ipHash = Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");

    // 去重检查：同 hash + 同 URL 30 分钟内已有记录则跳过
    const recent = await env.DB.prepare(
      "SELECT id FROM page_views WHERE ip_hash = ? AND url = ? AND created_at > datetime('now', '-30 minutes') LIMIT 1"
    ).bind(ipHash, url).first();

    if (!recent) {
      const country = request.headers.get("CF-IPCountry") || "??";
      await env.DB.prepare(
        "INSERT INTO page_views (url, ip_hash, country, created_at) VALUES (?, ?, ?, datetime('now'))"
      ).bind(url, ipHash, country).run();
    }

    return new Response(JSON.stringify({ ok: true }), { headers: h });
  } catch (e) {
    // 任何失败静默返回 ok，不影响访问者
    return new Response(JSON.stringify({ ok: true, silent: true }), { headers: h });
  }
}
