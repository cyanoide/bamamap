// Résout un pseudo en e-mail côté serveur (l'e-mail n'est jamais renvoyé au navigateur)
// puis ouvre la session. Les connexions par e-mail passent directement par supabase-js.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: { identifier?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const identifier = String(body.identifier ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!identifier || !password) return json({ error: "Identifiant et mot de passe requis" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let email = "";
  if (identifier.includes("@")) {
    email = identifier;
  } else {
    const { data: profile } = await admin.from("profiles").select("id").eq("pseudo", identifier).maybeSingle();
    if (profile) {
      const { data } = await admin.auth.admin.getUserById(profile.id);
      email = data.user?.email ?? "";
    }
  }

  // On tente toujours une connexion, même pour un pseudo inconnu : même réponse dans tous les cas d'échec.
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: email || "inconnu@bamamap.invalid", password });
  if (error || !data.session) return json({ error: "Identifiant ou mot de passe incorrect" }, 401);

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
