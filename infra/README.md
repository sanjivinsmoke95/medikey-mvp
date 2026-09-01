# infra/ — Terraform (staging / production)

Provisions the **India-region** cloud stack for **staging** and **production** only
(VPC, managed PostgreSQL, Redis, KMS, secret manager, object storage, CDN/WAF).

**Local development does NOT use this** — it uses `docker-compose.dev.yml` (local
Postgres + Redis) and a local key provider, so early development never requires cloud
infrastructure (approved adjustment 1).

## Layout (skeleton; filled in during P-infra hardening)
```
infra/
  modules/            # reusable modules (network, db, redis, kms, storage, cdn)
  envs/
    staging/          # staging root module (India region)
    production/       # production root module (India region)
```

## Guardrails (enforced during review — docs/impl/13-infrastructure.md)
- Region pinned to an Indian region for all data stores.
- Separate accounts/projects + separate KMS keys + secrets + DB per environment.
- No network path or credential allows local/dev/staging to read production data or keys.
- State encrypted; least-privilege IAM.

> Terraform is intentionally not applied in this MVP session — the app runs locally.
> `terraform validate`/`plan` are wired into CI when the modules land.
