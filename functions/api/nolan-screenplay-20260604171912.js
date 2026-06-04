export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const path = url.searchParams.get("p") || "/";
  const today = new Date().toISOString().slice(0, 10);
  
  const key = `${today}:${path}`;
  const count = await env.COUNTERS.get(key);
  const newCount = (parseInt(count) || 0) + 1;
  await env.COUNTERS.put(key, newCount.toString());
  
  const totalKey = "total:all";
  const total = await env.COUNTERS.get(totalKey);
  const newTotal = (parseInt(total) || 0) + 1;
  await env.COUNTERS.put(totalKey, newTotal.toString());
  
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
