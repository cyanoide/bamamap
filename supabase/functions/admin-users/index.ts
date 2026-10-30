// Gestion des comptes Bamamap, réservée aux admins : lister, changer le rôle ou le pseudo, réinitialiser
// un mot de passe, supprimer. Pas de création : les comptes se créent dans Supabase (Authentication > Users).
// Les écritures passent par la clé service_role.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PSEUDO = /^[a-z0-9._-]{3,24}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "Non connecté" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return json({ error: "Réservé aux administrateurs" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }

  const pseudoOf = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const passwordOk = (v: unknown) => typeof v === "string" && v.length >= 8;
  const pseudoTaken = async (pseudo: string, exceptId?: string) => {
    const { data } = await admin.from("profiles").select("id").eq("pseudo", pseudo).maybeSingle();
    return !!data && data.id !== exceptId;
  };

  switch (body.action) {
    case "list": {
      const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      const { data: profiles } = await admin.from("profiles").select("id, pseudo, role");
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      const users = list.users
        .map((u) => ({
          id: u.id,
          pseudo: byId.get(u.id)?.pseudo ?? null,
          role: byId.get(u.id)?.role ?? null,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
        }))
        .sort((a, b) => String(a.pseudo).localeCompare(String(b.pseudo)));
      return json({ users });
    }

    case "set_role": {
      const id = String(body.id ?? "");
      if (id === user.id) return json({ error: "Vous ne pouvez pas modifier votre propre rôle" }, 400);
      if (body.role !== "user" && body.role !== "admin") return json({ error: "Rôle invalide" }, 400);
      const { error } = await admin.from("profiles").update({ role: body.role }).eq("id", id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    case "set_pseudo": {
      const id = String(body.id ?? "");
      const pseudo = pseudoOf(body.pseudo);
      if (!PSEUDO.test(pseudo)) return json({ error: "Pseudo invalide" }, 400);
      if (await pseudoTaken(pseudo, id)) return json({ error: "Ce pseudo est déjà pris" }, 409);
      const { error } = await admin.from("profiles").update({ pseudo }).eq("id", id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    case "set_password": {
      if (!passwordOk(body.password)) return json({ error: "Mot de passe : 8 caractères minimum" }, 400);
      const { error } = await admin.auth.admin.updateUserById(String(body.id ?? ""), { password: body.password as string });
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    case "delete": {
      const id = String(body.id ?? "");
      if (id === user.id) return json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    default:
      return json({ error: "Action inconnue" }, 400);
  }
});
