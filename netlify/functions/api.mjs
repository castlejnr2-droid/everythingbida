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
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Email notification for new orders
    if (req.method === "POST" && action === "notify") {
      const { orderId, total, customer, items } = await req.json();
      const emailBody = `New EverythingBida Order!\n\nOrder ID: ${orderId}\nCustomer: ${customer.name}\nPhone: ${customer.phone}\nDelivery: ${customer.method === "pickup" ? "Store Pickup" : "Delivery to " + (customer.address || "N/A")}\n\nItems:\n${items}\n\nTotal: ₦${Number(total).toLocaleString()}\n\nCheck your dashboard: https://everythingbida.netlify.app`;
      
      // Send via EmailJS REST API
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_5ihurgd",
          template_id: "template_5v03alq",
          user_id: "ypcFbU8zY8bkhogIB",
          accessToken: "DaMl55ZyLBDgZ7Lgyt91Q",
          template_params: {
            to_email: "bidaspecialist@gmail.com",
            order_id: orderId,
            customer_name: customer.name,
            customer_phone: customer.phone,
            delivery_method: customer.method === "pickup" ? "Store Pickup" : "Delivery",
            delivery_address: customer.address || "N/A",
            items_list: items,
            total: `₦${Number(total).toLocaleString()}`,
            message: emailBody,
          },
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    const store = getStore({ name: "everythingbida", consistency: "strong" });
    const resource = url.searchParams.get("r"); // products, orders, messages, bank

    if (!resource && !action) {
      return new Response(JSON.stringify({ error: "Missing resource param ?r=" }), { status: 400, headers });
    }
    if (!resource) {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers });
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
