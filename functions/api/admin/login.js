// 登录 API：校验密码，发 HttpOnly Cookie
export async function onRequestPost({ request, env }) {
  const h = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const { password } = await request.json();
    if (!password) {
      return new Response(JSON.stringify({ error: "请输入密码" }), { status: 400, headers: h });
    }
    if (password !== env.ADMIN_TOKEN) {
      // 防爆破：故意延迟 1.5 秒
      await new Promise(r => setTimeout(r, 1500));
      return new Response(JSON.stringify({ error: "密码错误" }), { status: 401, headers: h });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...h,
        "Set-Cookie": `admin_token=${env.ADMIN_TOKEN}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "服务器错误" }), { status: 500, headers: h });
  }
}

export async function onRequestDelete() {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "admin_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
    }
  });
}
