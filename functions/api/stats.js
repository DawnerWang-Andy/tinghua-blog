export async function onRequestGet({ env }) {
  const data = { total: 0, today: 0, pages: {}, pages_today: {}, days: {} };
  const list = await env.COUNTERS.list();
  const today = new Date().toISOString().slice(0, 10);

  for (const key of list.keys) {
    const val = await env.COUNTERS.get(key.name);
    const num = parseInt(val) || 0;
    if (key.name.startsWith("202")) {
      const [date, ...pathParts] = key.name.split(":");
      const page = pathParts.join(":") || "/";
      data.pages[page] = (data.pages[page] || 0) + num;
      if (date === today) {
        data.pages_today[page] = (data.pages_today[page] || 0) + num;
        data.today += num;
      }
      data.days[date] = (data.days[date] || 0) + num;
      data.total += num;
    }
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
