export async function onRequest(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const h = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-cache" };
  if (request.method === "OPTIONS") return new Response(null, { headers: h });
  try {
    if (request.method === "GET") {
      const pageUrl = u.searchParams.get("url") || "/";
      const { results } = await env.DB.prepare("SELECT id, nick, link, content, pid, rid, created_at, is_admin FROM comments WHERE url = ? AND approved = 1 ORDER BY created_at ASC").bind(pageUrl).all();
      const top = results.filter(c => !c.pid || c.pid === 0);
      const replies = results.filter(c => c.pid && c.pid !== 0);
      const buildTree = (c, rs) => { const ch = rs.filter(r => r.pid === c.id).map(r => buildTree(r, rs)); return { ...c, children: ch }; };
      return new Response(JSON.stringify({ data: top.map(c => buildTree(c, replies)) }), { headers: h });
    }
    if (request.method === "POST") {
      const body = await request.json();
      const { url: pageUrl, nick, mail, link, content, pid, rid } = body;
      if (!pageUrl || !nick || !content) return new Response(JSON.stringify({ error: "缺少必填字段" }), { status: 400, headers: h });
      if (nick.length > 50 || content.length > 5000) return new Response(JSON.stringify({ error: "昵称不超过50字,评论不超过5000字" }), { status: 400, headers: h });
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { results: recent } = await env.DB.prepare("SELECT id FROM comments WHERE ip = ? AND created_at > datetime('now', '-30 seconds') LIMIT 1").bind(ip).all();
      if (recent.length > 0) return new Response(JSON.stringify({ error: "发送太快,请30秒后再试" }), { status: 429, headers: h });
      const now = new Date().toISOString();
      const result = await env.DB.prepare("INSERT INTO comments (url, nick, mail, link, content, pid, rid, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(pageUrl, nick.trim(), (mail || "").trim(), (link || "").trim(), content.trim(), pid || 0, rid || 0, ip, now).run();
      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id, data: { id: result.meta.last_row_id, nick: nick.trim(), link: (link || "").trim(), content: content.trim(), pid: pid || 0, created_at: now, is_admin: 0, children: [] } }), { status: 201, headers: h });
    }
    if (request.method === "DELETE") {
      const id = u.searchParams.get("id"), token = u.searchParams.get("token");
      if (token !== env.ADMIN_TOKEN) return new Response(JSON.stringify({ error: "无权限" }), { status: 403, headers: h });
      await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), { headers: h });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "服务器错误: " + e.message }), { status: 500, headers: h });
  }
}
