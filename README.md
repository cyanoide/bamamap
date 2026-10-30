# Bamamap

Copie de CameraMap, protégée par une connexion (même Supabase et même compte que Cyanocast).

- `docs/index.html` : l'application (GitHub Pages, branche `main`, dossier `/docs`)
- `supabase/migrations/` : tables `bamamap_projects` (le projet JSON en `jsonb`), `bamamap_config` et `profiles` (pseudo + rôle), avec règles RLS
- `supabase/functions/login` : connexion par pseudo (le pseudo est résolu côté serveur)
- `supabase/functions/admin-users` : gestion des comptes, réservée aux admins

Les données du projet (repères, groupes, flèches, logos) ne sont jamais dans le dépôt : elles sont lues et écrites en base, uniquement pour l'utilisateur admin connecté.

**Première utilisation** : se connecter, `Ouvrir` le fichier `projet_map_v16 (xx).json`, puis `Sauver`. Les connexions suivantes chargent le projet depuis la base. `Exporter` télécharge une copie `.json`.

Le jeton Mapbox est dans la table `bamamap_config` et le code de la carte ne s'exécute qu'après la connexion. La clé `anon` dans `docs/index.html` est publique par conception ; l'accès est protégé par les règles RLS. Ne jamais committer la clé `service_role`.

## Comptes et rôles

Chaque compte a un pseudo et un rôle, `user` par défaut. Connexion par e-mail ou par pseudo.

- `user` : consulte la carte (pas de roue dentée, ni Sauver, Ouvrir, Exporter, Comptes).
- `admin` : tout ce qui précède, plus la gestion des comptes (bouton Comptes : créer, passer ou retirer admin, changer pseudo ou mot de passe, supprimer).

Le rôle se change dans le bouton Comptes, ou à la main dans la table `profiles` de Supabase. Les règles RLS font respecter les rôles : les `user` ne peuvent rien écrire.
