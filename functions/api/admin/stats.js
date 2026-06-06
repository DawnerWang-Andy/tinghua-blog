// 仪表盘数据聚合 API
// 所有数据源失败时降级，不会抛 500
export async function onRequestGet({ env }) {
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  };

  const stats = {
    generated_at: new Date().toISOString(),
    comments: { ok: false, total: 0, pages: 0, recent: [], top_pages: [], by_day: [] },
    site: { ok: true, base_url: "https://bankai-5ss.pages.dev" },
    deploy: { ok: false, last_commit: null, last_commit_time: null }
  };

  // 1. 评论数据（D1）
  try {
    const totalRes = await env.DB.prepare(
      "SELECT COUNT(*) as total, COUNT(DISTINCT url) as pages FROM comments WHERE approved = 1"
    ).first();
    stats.comments.total = totalRes?.total || 0;
    stats.comments.pages = totalRes?.pages || 0;

    const recent = await env.DB.prepare(
      "SELECT id, nick, content, url, created_at FROM comments WHERE approved = 1 ORDER BY created_at DESC LIMIT 10"
    ).all();
    stats.comments.recent = (recent.results || []).map(c => ({
      ...c,
      content: c.content.length > 80 ? c.content.slice(0, 80) + "…" : c.content
    }));

    const topPages = await env.DB.prepare(
      "SELECT url, COUNT(*) as count FROM comments WHERE approved = 1 GROUP BY url ORDER BY count DESC LIMIT 5"
    ).all();
    stats.comments.top_pages = topPages.results || [];

    const byDay = await env.DB.prepare(
      "SELECT DATE(created_at) as day, COUNT(*) as count FROM comments WHERE approved = 1 AND created_at > datetime('now', '-30 days') GROUP BY day ORDER BY day ASC"
    ).all();
    stats.comments.by_day = byDay.results || [];

    stats.comments.ok = true;
  } catch (e) {
    stats.comments.error = String(e.message || e);
  }

  // 2. 章节进度（直接读 hugo 编译出的 sitemap 或写死 30）
  stats.novel = {
    total_chapters: 30,
    published: 0,
    next_release: null
  };
  try {
    const sitemap = await fetch(stats.site.base_url + "/sitemap.xml");
    if (sitemap.ok) {
      const text = await sitemap.text();
      const chapters = (text.match(/\/novels\/chapter-\d+\//g) || []).length;
      stats.novel.published = chapters;
    }
  } catch (e) {
    // 静默降级
  }

  return new Response(JSON.stringify(stats, null, 2), { headers: h });
}
