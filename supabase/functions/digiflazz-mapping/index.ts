import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function mirrorMapping(providerSku: string, productId: string | null) {
  const now = new Date().toISOString();
  const { data: row } = await db.from("provider_products")
    .select("id")
    .eq("provider", "digiflazz")
    .eq("provider_sku", providerSku)
    .maybeSingle();
  if (row) {
    const { error } = await db.from("provider_products").update({
      product_id: productId,
      is_active: productId ? true : false,
      updated_at: now,
    }).eq("id", row.id);
    if (error) throw error;
  }
}

async function mapOne(providerSku: string, productId: string, allowLocked = false) {
  const { data: target, error: te } = await db.from("provider_catalog")
    .select("id,provider_sku,mapping_locked,mapped_product_id")
    .eq("provider", "digiflazz").eq("provider_sku", providerSku).single();
  if (te || !target) throw new Error("SKU_PROVIDER_NOT_FOUND");
  if (target.mapping_locked && !allowLocked) throw new Error("MAPPING_LOCKED");

  // A website product can have only one active Digiflazz mapping.
  const { error: clear } = await db.from("provider_catalog")
    .update({ mapped_product_id: null, mapped_at: null, updated_at: new Date().toISOString() })
    .eq("provider", "digiflazz").eq("mapped_product_id", productId);
  if (clear) throw clear;
  await db.from("provider_products").update({ product_id: null, is_active: false, updated_at: new Date().toISOString() })
    .eq("provider", "digiflazz").eq("product_id", productId);

  const { error } = await db.from("provider_catalog").update({
    mapped_product_id: productId,
    mapped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", target.id);
  if (error) throw error;
  await mirrorMapping(providerSku, productId);
}

Deno.serve(async (req) => {
  try {
    const actor = await assertAdmin(req);
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "");

    if (action === "map") {
      await mapOne(String(b.provider_sku || ""), String(b.product_id || ""));
      return Response.json({ ok: true });
    }

    if (action === "unmap") {
      const sku = String(b.provider_sku || "");
      const { data: row } = await db.from("provider_catalog").select("id,mapping_locked").eq("provider","digiflazz").eq("provider_sku",sku).single();
      if (!row) return Response.json({ error: "SKU_PROVIDER_NOT_FOUND" }, { status: 404 });
      if (row.mapping_locked) return Response.json({ error: "MAPPING_LOCKED" }, { status: 409 });
      const { error } = await db.from("provider_catalog").update({ mapped_product_id:null, mapped_at:null, updated_at:new Date().toISOString() }).eq("id",row.id);
      if (error) throw error;
      await mirrorMapping(sku, null);
      return Response.json({ ok: true });
    }

    if (action === "lock" || action === "unlock") {
      const sku = String(b.provider_sku || "");
      const locked = action === "lock";
      const { error } = await db.from("provider_catalog").update({ mapping_locked: locked, updated_at:new Date().toISOString() })
        .eq("provider","digiflazz").eq("provider_sku",sku);
      if (error) throw error;
      return Response.json({ ok: true, mapping_locked: locked });
    }

    if (action === "auto_map") {
      const { data: catalog, error: ce } = await db.from("provider_catalog")
        .select("id,provider_sku,provider_name,provider_brand,mapped_product_id,mapping_locked")
        .eq("provider","digiflazz");
      if (ce) throw ce;
      const { data: products, error: pe } = await db.from("game_products")
        .select("id,name,nominal,sku,game_id,games:game_id(name)");
      if (pe) throw pe;

      const used = new Set<string>(
        (catalog || []).filter(x => x.mapped_product_id).map(x => String(x.mapped_product_id))
      );
      let mapped = 0;
      for (const c of catalog || []) {
        if (c.mapping_locked || c.mapped_product_id) continue;
        const sku = String(c.provider_sku || "").toLowerCase();
        let candidates = (products || []).filter(p => String(p.sku || "").toLowerCase() === sku && !used.has(String(p.id)));
        if (candidates.length !== 1) {
          const brand = String(c.provider_brand || "").toLowerCase().trim();
          const nominalDigits = String(c.provider_name || "").replace(/\D/g, "");
          candidates = (products || []).filter(p => {
            if (used.has(String(p.id)) || !brand || !nominalDigits) return false;
            const gameName = String(p.games?.name || "").toLowerCase();
            const gameMatch = gameName.includes(brand) || brand.includes(gameName);
            const productNominal = String(p.nominal || "").replace(/\D/g, "");
            return gameMatch && productNominal !== "" && productNominal === nominalDigits;
          });
        }
        if (candidates.length === 1) {
          await mapOne(String(c.provider_sku), String(candidates[0].id), true);
          used.add(String(candidates[0].id));
          mapped++;
        }
      }
      return Response.json({ ok:true, mapped, actor });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "MAPPING_LOCKED" ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
});
