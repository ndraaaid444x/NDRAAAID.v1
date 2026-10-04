import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:js-md5@0.8.3";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

async function assertAdmin(req: Request) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) throw new Error("Unauthorized");

  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") || service);
  const { data, error } = await anon.auth.getUser(h.slice(7));
  if (error || !data.user) throw new Error("Unauthorized");

  const { data: p, error: pe } = await db
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", data.user.id)
    .single();

  if (pe) throw new Error(`Admin profile check failed: ${pe.message}`);
  if (!p || p.is_suspended || !["owner", "admin", "co_owner"].includes(p.role)) {
    throw new Error("Forbidden");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    await assertAdmin(req);

    const username = (Deno.env.get("DIGIFLAZZ_USERNAME") || "").trim();
    const api = (Deno.env.get("DIGIFLAZZ_API_KEY") || "").trim();
    if (!username) return response({ ok: false, error: "DIGIFLAZZ_USERNAME belum terbaca oleh Edge Function.", stage: "credentials", transaction_enabled: false }, 503);
    if (!api) return response({ ok: false, error: "DIGIFLAZZ_API_KEY belum terbaca oleh Edge Function.", stage: "credentials", transaction_enabled: false }, 503);

    const sign = md5.hex(username + api + "pricelist");

    let r: Response;
    try {
      r = await fetch("https://api.digiflazz.com/v1/price-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "prepaid", username, sign }),
      });
    } catch (e) {
      return response({
        ok: false,
        error: `Gagal terhubung ke Digiflazz: ${e instanceof Error ? e.message : String(e)}`,
        stage: "digiflazz_fetch",
        transaction_enabled: false,
      }, 502);
    }

    const raw = await r.text();
    let j: any;
    try {
      j = JSON.parse(raw);
    } catch {
      return response({ ok: false, error: "Respons Digiflazz bukan JSON.", stage: "digiflazz_response", transaction_enabled: false }, 502);
    }

    if (!r.ok) {
      const message =
        typeof j?.message === "string" ? j.message :
        typeof j?.data?.message === "string" ? j.data.message :
        `Digiflazz HTTP ${r.status}`;
      return response({ ok: false, error: message, stage: "digiflazz_api", transaction_enabled: false }, r.status);
    }

    const rows = Array.isArray(j?.data) ? j.data : [];
    const now = new Date().toISOString();

    const catalogRows = rows
      .map((x: any) => {
        const sku = String(x?.buyer_sku_code || "").trim();
        if (!sku) return null;
        return {
          provider: "digiflazz",
          provider_sku: sku,
          provider_name: x?.product_name ?? null,
          provider_category: x?.category ?? null,
          provider_brand: x?.brand ?? null,
          provider_type: x?.type ?? null,
          seller_name: x?.seller_name ?? null,
          provider_price: x?.price == null ? null : Number(x.price),
          buyer_product_status: x?.buyer_product_status ?? null,
          seller_product_status: x?.seller_product_status ?? null,
          unlimited_stock: x?.unlimited_stock ?? null,
          stock: x?.stock == null ? null : Number(x.stock),
          multi: x?.multi ?? null,
          start_cut_off: x?.start_cut_off ?? null,
          end_cut_off: x?.end_cut_off ?? null,
          description: x?.desc ?? null,
          raw_data: x,
          last_synced_at: now,
          updated_at: now,
        };
      })
      .filter(Boolean);

    // Sync only the canonical provider_catalog table.
    // provider_products is the legacy transaction table and may require
    // product_id, so it must never be populated by an un-mapped provider SKU.
    for (let i = 0; i < catalogRows.length; i += 100) {
      const batch = catalogRows.slice(i, i + 100);
      const { error } = await db
        .from("provider_catalog")
        .upsert(batch, { onConflict: "provider,provider_sku" });

      if (error) {
        return response({
          ok: false,
          error: `Gagal menyimpan katalog provider: ${error.message}`,
          stage: "catalog_upsert",
          transaction_enabled: false,
          batch_start: i,
        }, 500);
      }
    }

    return response({
      ok: true,
      synced: catalogRows.length,
      received: rows.length,
      transaction_enabled: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status =
      message === "Unauthorized" ? 401 :
      message === "Forbidden" ? 403 : 500;

    return response({
      ok: false,
      error: message,
      stage: "runtime",
      transaction_enabled: false,
    }, status);
  }
});
