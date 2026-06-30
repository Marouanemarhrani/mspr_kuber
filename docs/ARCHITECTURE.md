# Architecture – TP MSPR (OpenFaaS + PostgreSQL)

## Contexte TP

- **Une seule table** en base : `users` (ID, username, password, MFA, gendate, expired).
- **3 fonctions** : génération mot de passe + QR, génération 2FA + QR, authentification (avec règle des 6 mois et marquage `expired`).

## Vue d’ensemble

- **3 fonctions OpenFaaS** (Node.js, `pg` Pool) : `generate-password`, `twofa`, `authenticate`
- **1 instance PostgreSQL** (StatefulSet, non scalable), namespace `database`
- **Accès** : les fonctions utilisent le DNS Kubernetes `postgres.database.svc.cluster.local`
- **Secrets** : identifiants DB et `ENCRYPTION_KEY` dans des Secrets Kubernetes ; rien de sensible dans le code

## Namespaces

| Namespace     | Contenu |
|--------------|--------|
| `openfaas`   | Gateway et contrôle OpenFaaS |
| `openfaas-fn`| Les 3 fonctions |
| `database`   | StatefulSet PostgreSQL + Service + Secret |
| `frontend`   | Deployment nginx (React + proxy /api) + Service LoadBalancer |

## Base de données

- **Une table** : `users`  
  - `id` (SERIAL), `username` (UNIQUE), `password` (TEXT, chiffré), `mfa` (TEXT, chiffré), `gendate` (BIGINT), `expired` (SMALLINT, 0/1)
- StatefulSet `postgres`, replicas: 1, PVC via `volumeClaimTemplates`
- Service ClusterIP `postgres`, port 5432
- Image : `marouanemarhrani/mspr:postgres` (Postgres 16 + script d’init)

## Fonctions

- **generate-password** : mot de passe 24 caractères (majuscules, minuscules, chiffres, caractères spéciaux), QR code, chiffrement AES puis insertion/mise à jour en base (password, gendate, expired=0).
- **twofa** : génération secret TOTP (speakeasy), QR code, chiffrement du secret MFA, mise à jour de la ligne `users` pour le `username`.
- **authenticate** : vérification login + mot de passe (déchiffrement) + code 2FA (TOTP). Si `gendate` &gt; 6 mois, mise à jour `expired = 1` et réponse indiquant de relancer la création mot de passe / 2FA côté frontend.

## Flux (cloud / EKS)

```
Internet → ALB → Nginx (React + proxy /api) → OpenFaaS (ClusterIP + BasicAuth) → PostgreSQL
```

- **Frontend** (namespace `frontend`) : image `mspr:frontend` (nginx:alpine + build React). Sert les fichiers statiques et proxy `/api/*` vers `http://gateway.openfaas.svc.cluster.local:8080/function/*`.
- Le client appelle uniquement `/api/generate-password`, `/api/twofa`, `/api/authenticate` (même origine, pas d’URL gateway dans le frontend).
- La gateway OpenFaaS est en ClusterIP ; seul nginx (et l’ALB vers nginx) est exposé.

## Flux (détail)

1. Client → ALB → Nginx (frontend) → Gateway OpenFaaS → fonction (openfaas-fn)
2. Fonction lit `POSTGRES_*` et `ENCRYPTION_KEY` depuis le Secret (envFrom)
3. Connexion à `postgres.database.svc.cluster.local:5432` via `pg.Pool`
4. Données stockées dans le namespace `database` sur PVC

## Sécurité

- Pas de credentials ni clé de chiffrement dans le code ou dans `stack.yaml`
- Secret `postgres-credentials` en `openfaas-fn` contient aussi `ENCRYPTION_KEY` pour le chiffrement password/MFA
- Service PostgreSQL en ClusterIP uniquement
- En production : changer `POSTGRES_PASSWORD` et `ENCRYPTION_KEY` dans les manifests / Secrets

## Scalabilité

- PostgreSQL : une seule instance (replicas: 1), volontaire pour le TP.
- Les fonctions peuvent être scalées par OpenFaaS ; le Pool `pg` limite les connexions par fonction.
