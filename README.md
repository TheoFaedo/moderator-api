# Jev Moderation API

**Language:** English | [Français](README.fr.md)

## Overview

This application was created as a *vibe coding* project: it makes it possible to quickly turn an idea into a working moderation service. Its goal is to provide client applications with a simple, reliable, privacy-conscious API for assessing risky text content.

It is designed to make moderation easy to integrate into prototypes and products, centralize access to the Jev model, and retain neither the analyzed text nor moderation results.

Stateless Fastify API that estimates whether a text falls into at least one moderation category. Each request makes a single call to Jev. The text, decision, and scores are neither logged nor persisted.

## Local setup

Node.js 22+ is required at runtime. Bun is used for dependencies and development commands.

```sh
bun install
cp .env.example .env
# Set TYPESAFE_API_KEY in .env (or export the variables)
export TYPESAFE_API_KEY=ts_live_replace_me
export API_KEYS_DB_PATH=./data/api-keys.sqlite
bun run keys create "local application"
bun run start
```

The create command displays the secret only once. Store it in a secrets manager.

```sh
curl http://localhost:3000/healthz
curl -X POST http://localhost:3000/v1/moderations \
  -H "Authorization: Bearer jevmod_…" \
  -H 'Content-Type: application/json' \
  -d '{"text":"I am going to hurt you", "categories":["violence_threat"]}'
```

Successful response:

```json
{"id":"…","probability":0.98,"confidence":0.95}
```

`categories` is optional: if omitted, all six categories are applied (`racism_hate`, `insult_harassment`, `violence_threat`, `sexual_content`, `self_harm`, `illegal_activity`).

## Client API keys

```sh
bun run keys list
bun run keys revoke <id>
```

SQLite stores only the SHA-256 fingerprint of each key, its prefix, name, creation date, and optional revocation date — never the secret itself.

## Docker

```sh
docker build -t jev-moderation-api .
docker run --rm -p 3000:3000 \
  -e TYPESAFE_API_KEY=ts_live_replace_me \
  -e API_KEYS_DB_PATH=/data/api-keys.sqlite \
  -v "$(pwd)/data:/data" jev-moderation-api
```

Create keys from a local installation that points to the same volume, or run the CLI temporarily in the image. Optional settings are `HOST`, `PORT`, `LOG_LEVEL`, `JEV_TIMEOUT_MS` (5,000 by default), and `RATE_LIMIT_PER_MINUTE` (60 by default). The rate limit is local to each instance.

Upstream errors return `502` (unavailable) or `504` (timeout). The `GET /healthz` and `GET /readyz` endpoints do not require authentication.
