# Bamamap

Copie de CameraMap, protégée par une connexion (même Supabase et même compte que Cyanocast).

- `docs/index.html` : l'application (GitHub Pages, branche `main`, dossier `/docs`)
- `supabase/migrations/` : tables `bamamap_projects` (le projet JSON en `jsonb`) et `bamamap_config`, avec règles RLS

Les données du projet (repères, groupes, flèches, logos) ne sont jamais dans le dépôt : elles sont lues et écrites en base, uniquement pour l'utilisateur admin connecté.

**Première utilisation** : se connecter, `Ouvrir` le fichier `projet_map_v16 (xx).json`, puis `Sauver`. Les connexions suivantes chargent le projet depuis la base. `Exporter` télécharge une copie `.json`.

Le jeton Mapbox est dans la table `bamamap_config` et le code de la carte ne s'exécute qu'après la connexion. La clé `anon` dans `docs/index.html` est publique par conception ; l'accès est protégé par les règles RLS. Ne jamais committer la clé `service_role`.
