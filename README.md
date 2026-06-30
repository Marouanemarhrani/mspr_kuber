# MSPR – OpenFaaS + Kubernetes + PostgreSQL

Run the project with **Kubernetes**, **OpenFaaS**, **Docker** and **Docker Hub** (no other method).

## Conformité cahier des charges (COFRAP)

- **Base de données** : une seule table `users` avec les attributs demandés : **ID** (`id`), **username**, **password** (chiffré), **MFA** (`mfa`, chiffré), **gendate** (timestamp Unix), **expired** (0/1). Schéma dans `postgres/init/01-schema.sql`.
- **Fonction génération mot de passe** : mot de passe 24 caractères (majuscules, minuscules, chiffres, caractères spéciaux), QR code du mot de passe, stockage du mot de passe **chiffré** en base.
- **Fonction 2FA** : génération du secret 2FA (TOTP) et QR code, stockage **chiffré** en base (MFA).
- **Fonction authentification** : authentification par login, mot de passe et code 2FA ; si identifiants &gt; 6 mois, marquage du compte en **expired** en base et réponse au frontend pour relancer la création mot de passe + 2FA.
- **Frontend** : authentification, création de compte (mot de passe + 2FA), relance de la création mot de passe / 2FA en cas d’expiration.

## If you see "connection refused" on port-forward

`kubectl port-forward -n openfaas svc/gateway 8080:8080` fails with **"The connection to the server 127.0.0.1:XXXXX was refused"** when your **Kubernetes cluster is not running**. Fix it by starting the cluster first:

1. **Start Docker Desktop** (must be running).
2. **Start the cluster:**  
   `minikube start`
3. **Install OpenFaaS** (once per cluster):  
   `arkade install openfaas`
4. **Deploy the app:**  
   `./deploy.sh`
5. **In another terminal, expose the gateway:**  
   `kubectl port-forward -n openfaas svc/gateway 8080:8080`  
   Leave this running. Then run the frontend (e.g. `cd frontend && npm run dev`).

## Build and push images

```bash
./build-and-push.sh
```

## Deploy (Kubernetes + OpenFaaS)

```bash
./deploy.sh
```

Then in a **separate terminal**:

```bash
kubectl port-forward -n openfaas svc/gateway 8080:8080
```

Frontend: `cd frontend && npm run dev` (proxy targets port 8080).

## Test

```bash
./run-tests.sh
```

(Requires gateway reachable on 8080.)

## Troubleshooting

**"password authentication failed for user \"mspr\""** (e.g. on Create account): Postgres was initialized with different credentials or a bad volume. To get a fresh DB with user `mspr`: 1) `kubectl scale statefulset postgres -n database --replicas=0` 2) `kubectl delete pvc -n database postgres-data-postgres-0` (or `postgres-data-v2-postgres-0` if you already have the updated StatefulSet) 3) If the StatefulSet uses the old volume name, delete it: `kubectl delete statefulset postgres -n database --cascade=orphan` then `kubectl apply -f k8s/database/statefulset.yaml` 4) Otherwise `kubectl scale statefulset postgres -n database --replicas=1` 5) `kubectl wait --for=condition=ready pod -l app=postgres -n database --timeout=120s` 6) `kubectl rollout restart deployment generate-password twofa authenticate -n openfaas-fn`. All existing DB data will be lost.
