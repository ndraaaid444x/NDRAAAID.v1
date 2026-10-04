import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:js-md5@0.8.3";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service);

async function assertAdmin(req: Request) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) throw new Error("Unauthorized");
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") || service);
  const { data, error } = await anon.auth.getUser(h.slice(7));
  if (error || !data.user) throw new Error("Unauthorized");
  const { data: p } = await db.from("profiles").select("role,is_suspended").eq("id", data.user.id).single();
  if (!p || p.is_suspended || !["owner","admin","co_owner"].includes(p.role)) throw new Error("Forbidden");
  return data.user.id;
}

Deno.serve(async (req) => {
  try {
    await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const username = Deno.env.get("DIGIFLAZZ_USERNAME") || "";
    const api = Deno.env.get("DIGIFLAZZ_API_KEY") || "";
    if (!username || !api) return Response.json({ error: "Digiflazz credentials belum diatur di Supabase Secrets." }, { status: 503 });

    const sign = md5.hex(username + api + "pricelist");
    const r = await fetch("https://api.digiflazz.com/v1/price-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "prepaid", username, sign }),
    });
    const j = await r.json();
    if (!r.ok) return Response.json(j, { status: r.status });

    const rows = Array.isArray(j.data) ? j.data : [];
    let synced = 0;
    for (const x of rows) {
      const sku = String(x?.buyer_sku_code || "").trim();
      if (!sku) continue;
      const common = {
        provider: "digiflazz",
        provider_sku: sku,
        provider_name: x.product_name ?? null,
        provider_category: x.category ?? null,
        provider_brand: x.brand ?? null,
        provider_type: x.type ?? null,
        seller_name: x.seller_name ?? null,
        provider_price: x.price == null ? null : Number(x.price),
        buyer_product_status: x.buyer_product_status ?? null,
        seller_product_status: x.seller_product_status ?? null,
        unlimited_stock: x.unlimited_stock ?? null,
        stock: x.stock == null ? null : Number(x.stock),
        multi: x.multi ?? null,
        start_cut_off: x.start_cut_off ?? null,
        end_cut_off: x.end_cut_off ?? null,
        description: x.desc ?? null,
        raw_data: x,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: ce } = await db.from("provider_catalog").upsert(common, { onConflict: "provider,provider_sku" });
      if (ce) throw ce;

      // Keep the legacy provider_products table in sync for the future transaction path.
      const { data: existing } = await db.from("provider_products")
        .select("id,product_id")
        .eq("provider", "digiflazz")
        .eq("provider_sku", sku)
        .maybeSingle();

      const { error: pe } = await db.from("provider_products").upsert({
        ...common,
        ...(existing?.product_id ? { product_id: existing.product_id } : {}),
      }, { onConflict: "provider,provider_sku" });
      if (pe) throw pe;
      synced++;
    }

    return Response.json({ ok: true, synced, received: rows.length, transaction_enabled: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
});
