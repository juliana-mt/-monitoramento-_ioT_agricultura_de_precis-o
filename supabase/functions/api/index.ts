import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const DEVICE_API_KEY = Deno.env.get("DEVICE_API_KEY");
const LIMITE_ALERTA = 30; // % abaixo disso = solo seco

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Pré-requisição do navegador (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // O caminho vem como /api/readings, /api/latest ou /api/history
  const route = url.pathname.split("/").filter(Boolean).pop();

  try {
    // ---------- POST /readings : ESP32 envia leitura ----------
    if (req.method === "POST" && route === "readings") {
      if (!DEVICE_API_KEY || req.headers.get("x-api-key") !== DEVICE_API_KEY) {
        return json({ error: "Chave de API inválida" }, 401);
      }

      const body = await req.json();
      const { device_id, metric, value, unit } = body;

      if (!device_id || !metric || !unit || typeof value !== "number") {
        return json({ error: "Campos obrigatórios: device_id, metric, value (número), unit" }, 400);
      }
      if (value < 0 || value > 100) {
        return json({ error: "Valor fora da faixa 0-100" }, 400);
      }

      const alert = value < LIMITE_ALERTA;

      const { data, error } = await supabase
        .from("readings")
        .insert({ device_id, metric, value, unit, alert })
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);

      console.log(`Leitura recebida: ${device_id} ${metric}=${value}${unit} alerta=${alert}`);
      return json(data, 201);
    }

    // ---------- GET /latest : leitura mais recente ----------
    if (req.method === "GET" && route === "latest") {
      const device_id = url.searchParams.get("device_id") ?? "horta-01";
      const metric = url.searchParams.get("metric") ?? "soil_moisture";

      const { data, error } = await supabase
        .from("readings")
        .select("*")
        .eq("device_id", device_id)
        .eq("metric", metric)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    // ---------- GET /history : histórico ----------
    if (req.method === "GET" && route === "history") {
      const device_id = url.searchParams.get("device_id") ?? "horta-01";
      const metric = url.searchParams.get("metric") ?? "soil_moisture";
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 500);

      const { data, error } = await supabase
        .from("readings")
        .select("*")
        .eq("device_id", device_id)
        .eq("metric", metric)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    return json({ error: "Rota não encontrada" }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});