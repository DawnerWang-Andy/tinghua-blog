// 仪表盘数据聚合 API（扩展版）
// 设计原则：每个数据源独立 try/catch，任一失败不影响其它，永不抛 500
export async function onRequestGet({ env, request }) {
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  };

  const SITE = "https://bankai-5ss.pages.dev";
  const T0 = Date.now();

  const stats = {
    generated_at: new Date().toISOString(),
    site: { base_url: SITE },
    comments: { ok: false },
    novel: { ok: false },
    deploy: { ok: false },
    health: { ok: false }
  };

  // ============ 1. 评论数据（D1） ============
  try {
    const total = await env.DB.prepare(
      "SELECT COUNT(*) as approved, COUNT(DISTINCT url) as pages, COUNT(DISTINCT nick) as unique_users, AVG(LENGTH(content)) as avg_len, SUM(LENGTH(content)) as total_chars FROM comments WHERE approved = 1"
    ).first();

    const pending = await env.DB.prepare(
      "SELECT COUNT(*) as pending FROM comments WHERE approved = 0"
    ).first();

    const recent = await env.DB.prepare(
      "SELECT id, nick, content, url, created_at FROM comments WHERE approved = 1 ORDER BY created_at DESC LIMIT 15"
    ).all();

    const topPages = await env.DB.prepare(
      "SELECT url, COUNT(*) as count FROM comments WHERE approved = 1 GROUP BY url ORDER BY count DESC LIMIT 10"
    ).all();

    const topUsers = await env.DB.prepare(
      "SELECT nick, COUNT(*) as count FROM comments WHERE approved = 1 GROUP BY nick ORDER BY count DESC LIMIT 5"
    ).all();

    const byDay = await env.DB.prepare(
      "SELECT DATE(created_at) as day, COUNT(*) as count FROM comments WHERE approved = 1 AND created_at > datetime('now', '-30 days') GROUP BY day ORDER BY day ASC"
    ).all();

    const byHour = await env.DB.prepare(
      "SELECT CAST(strftime('%H', created_at, '+8 hours') AS INTEGER) as hour, COUNT(*) as count FROM comments WHERE approved = 1 GROUP BY hour ORDER BY hour ASC"
    ).all();

    // 本周 vs 上周
    const thisWeek = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM comments WHERE approved = 1 AND created_at > datetime('now', '-7 days')"
    ).first();
    const lastWeek = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM comments WHERE approved = 1 AND created_at > datetime('now', '-14 days') AND created_at <= datetime('now', '-7 days')"
    ).first();

    stats.comments = {
      ok: true,
      total: total?.approved || 0,
      pages: total?.pages || 0,
      unique_users: total?.unique_users || 0,
      pending: pending?.pending || 0,
      avg_length: Math.round(total?.avg_len || 0),
      total_chars: total?.total_chars || 0,
      this_week: thisWeek?.c || 0,
      last_week: lastWeek?.c || 0,
      week_delta_pct: lastWeek?.c ? Math.round(((thisWeek?.c - lastWeek?.c) / lastWeek.c) * 100) : null,
      recent: (recent.results || []).map(c => ({
        ...c,
        content: c.content.length > 100 ? c.content.slice(0, 100) + "…" : c.content
      })),
      top_pages: topPages.results || [],
      top_users: topUsers.results || [],
      by_day: byDay.results || [],
      by_hour: byHour.results || []
    };
  } catch (e) {
    stats.comments = { ok: false, error: String(e.message || e) };
  }

  // ============ 2. 章节与字数统计（sitemap + 拉取章节内容估算） ============
  try {
    const sitemapRes = await fetch(SITE + "/sitemap.xml", { cf: { cacheTtl: 300 } });
    if (!sitemapRes.ok) throw new Error("sitemap " + sitemapRes.status);
    const text = await sitemapRes.text();
    const chapterUrls = [...text.matchAll(/<loc>([^<]*\/novels\/chapter-\d+\/)<\/loc>/g)].map(m => m[1]);

    // 并行拉每个章节 HTML，提取主体字数（CF Worker 子请求并行限制 6，章节够少不会触发）
    const counts = await Promise.allSettled(
      chapterUrls.map(async u => {
        const r = await fetch(u, { cf: { cacheTtl: 600 } });
        if (!r.ok) return { url: u, ok: false, chars: 0 };
        const html = await r.text();
        // 粗略估算：去标签、保留中文字符
        const body = html.replace(/<script[^]*?<\/script>/gi, "")
                         .replace(/<style[^]*?<\/style>/gi, "")
                         .replace(/<[^>]+>/g, "");
        const chinese = (body.match(/[一-龥]/g) || []).length;
        const slug = u.match(/chapter-(\d+)/)?.[1] || "?";
        return { chapter: parseInt(slug), url: u, chars: chinese, ok: true };
      })
    );

    const chapters = counts
      .filter(r => r.status === "fulfilled" && r.value.ok)
      .map(r => r.value)
      .sort((a, b) => a.chapter - b.chapter);

    const totalChars = chapters.reduce((s, c) => s + c.chars, 0);
    stats.novel = {
      ok: true,
      total_chapters: 30,
      published: chapters.length,
      total_chars: totalChars,
      avg_chars: chapters.length ? Math.round(totalChars / chapters.length) : 0,
      chapters: chapters.map(c => ({ chapter: c.chapter, chars: c.chars }))
    };
  } catch (e) {
    stats.novel = { ok: false, error: String(e.message || e) };
  }

  // ============ 3. 部署历史（GitHub API） ============
  try {
    const r = await fetch("https://api.github.com/repos/DawnerWang-Andy/tinghua-blog/commits?per_page=10", {
      headers: { "User-Agent": "bankai-dashboard", "Accept": "application/vnd.github+json" },
      cf: { cacheTtl: 300 }
    });
    if (!r.ok) throw new Error("github " + r.status);
    const commits = await r.json();
    stats.deploy = {
      ok: true,
      commits: commits.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split("\n")[0],
        date: c.commit.author.date,
        author: c.commit.author.name
      }))
    };
  } catch (e) {
    stats.deploy = { ok: false, error: String(e.message || e) };
  }

  // ============ 4. 健康自检（响应延迟） ============
  try {
    const probes = ["/", "/novels/", "/novels/chapter-01/", "/novels/foreword/"];
    const results = await Promise.allSettled(
      probes.map(async p => {
        const t = Date.now();
        const r = await fetch(SITE + p, { method: "HEAD" });
        return { path: p, status: r.status, ms: Date.now() - t };
      })
    );
    stats.health = {
      ok: true,
      probes: results.map(r => r.status === "fulfilled" ? r.value : { error: String(r.reason) })
    };
  } catch (e) {
    stats.health = { ok: false, error: String(e.message || e) };
  }

  stats.api_ms = Date.now() - T0;
  return new Response(JSON.stringify(stats, null, 2), { headers: h });
}
