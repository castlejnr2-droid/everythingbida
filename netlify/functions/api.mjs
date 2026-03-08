import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (req.method === "OPTIONS") return new Response("", { headers });

  try {
    const store = getStore({ name: "everythingbida", consistency: "strong" });
    const url = new URL(req.url);
    const resource = url.searchParams.get("r"); // products, orders, messages, bank

    if (!resource) {
      return new Response(JSON.stringify({ error: "Missing resource param ?r=" }), { status: 400, headers });
    }

    // GET — fetch resource
    if (req.method === "GET") {
      const raw = await store.get(resource);
      const data = raw ? JSON.parse(raw) : null;
      return new Response(JSON.stringify(data), { headers });
    }

    // POST — replace entire resource
    if (req.method === "POST") {
      const body = await req.json();
      await store.set(resource, JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};
