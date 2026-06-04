export async function onRequestGet({ env }) {
  const data = { total: 0, today: 0, pages: {}, days: {} };
  const list = await env.COUNTERS.list();
  const today = new Date().toISOString().slice(0, 10);
  
  for (const key of list.keys) {
    const val = await env.COUNTERS.get(key.name);
    const num = parseInt(val) || 0;
    if (key.name === "total:all") {
      data.total = num;
    } else if (key.name.startsWith("202")) {
      const [date, ...pathParts] = key.name.split(":");
      const page = pathParts.join(":") || "/";
      if (!data.pages[page]) data.pages[page] = 0;
      data.pages[page] += num;
      if (date === today) {
        if (!data.pages_today) data.pages_today = {};
        data.pages_today[page] = (data.pages_today[page] || 0) + num;
        data.today += num;
      }
      if (!data.days[date]) data.days[date] = 0;
      data.days[date] += num;
    }
  }
  
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
