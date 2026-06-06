// Admin 鉴权中间件
// 校验 Cookie 中的 admin_token，未通过则重定向到 /admin/login

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 登录页和登录 API 放行
  if (url.pathname === "/admin/login" || url.pathname === "/admin/login/" || url.pathname === "/api/admin/login") {
    return next();
  }

  // 其他 /admin/* 和 /api/admin/* 都要鉴权
  if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api/admin")) {
    return next();
  }

  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/admin_token=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token || token !== env.ADMIN_TOKEN) {
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return Response.redirect(new URL("/admin/login/", url.origin).toString(), 302);
  }

  return next();
}
