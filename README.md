# API de modération Jev

## Contexte

Cette application a été conçue dans une démarche de *vibe coding* : elle permet de transformer rapidement une idée en un service de modération concret et opérationnel. Son objectif est de fournir aux applications clientes une API simple, fiable et respectueuse de la confidentialité pour évaluer les contenus textuels à risque.

Elle vise notamment à faciliter l’intégration de la modération dans des prototypes et des produits, centraliser l’accès au modèle Jev, et ne conserver ni les textes analysés ni les résultats de modération.

API Fastify sans état pour estimer si un texte relève d’au moins une catégorie de modération. Chaque requête effectue un seul appel Jev. Le texte, la décision et les scores ne sont ni journalisés ni persistés.

## Démarrage local

Node.js 22+ est requis à l’exécution et Bun est utilisé pour les dépendances et les commandes de développement.

```sh
bun install
cp .env.example .env
# renseigner TYPESAFE_API_KEY dans .env (ou exporter les variables)
export TYPESAFE_API_KEY=ts_live_replace_me
export API_KEYS_DB_PATH=./data/api-keys.sqlite
bun run keys create "application locale"
bun run start
```

La commande de création affiche le secret une seule fois. Conservez-le dans un gestionnaire de secrets.

```sh
curl http://localhost:3000/healthz
curl -X POST http://localhost:3000/v1/moderations \
  -H "Authorization: Bearer jevmod_…" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Je vais te faire du mal", "categories":["violence_threat"]}'
```

Réponse de succès :

```json
{"id":"…","probability":0.98,"confidence":0.95}
```

`categories` est optionnel : sans lui, les six catégories sont appliquées (`racism_hate`, `insult_harassment`, `violence_threat`, `sexual_content`, `self_harm`, `illegal_activity`).

## Clés clientes

```sh
bun run keys list
bun run keys revoke <id>
```

SQLite ne conserve que l’empreinte SHA-256 de chaque clé, son préfixe, nom, date de création et éventuelle date de révocation — jamais le secret.

## Docker

```sh
docker build -t jev-moderation-api .
docker run --rm -p 3000:3000 \
  -e TYPESAFE_API_KEY=ts_live_replace_me \
  -e API_KEYS_DB_PATH=/data/api-keys.sqlite \
  -v "$(pwd)/data:/data" jev-moderation-api
```

Créez les clés depuis une installation locale pointant vers le même volume, ou lancez temporairement la CLI dans l’image. Les paramètres optionnels sont `HOST`, `PORT`, `LOG_LEVEL`, `JEV_TIMEOUT_MS` (5 000 par défaut) et `RATE_LIMIT_PER_MINUTE` (60 par défaut). Le rate limit est local à l’instance.

Les erreurs amont renvoient `502` (indisponibilité) ou `504` (expiration). Les endpoints `GET /healthz` et `GET /readyz` ne demandent pas d’authentification.
