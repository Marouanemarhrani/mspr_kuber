#!/usr/bin/env bash
# 1. Deploy PostgreSQL in namespace database
# 2. Create secret in openfaas-fn (DB + ENCRYPTION_KEY)
# 3. Deploy OpenFaaS functions (generate-password, twofa, authenticate)
# 4. Patch deployments to use envFrom secret
set -e
cd "$(dirname "$0")"
GATEWAY="${GATEWAY:-http://127.0.0.1:8080}"
NS_FN="${OPENFAAS_FN_NS:-openfaas-fn}"

if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: Cannot reach the Kubernetes API (connection refused)."
  echo "Your cluster is not running. Do this first:"
  echo "  1. Start Docker Desktop"
  echo "  2. Start the cluster:  minikube start"
  echo "  3. Install OpenFaaS:   arkade install openfaas"
  echo "  4. Run this script:   ./deploy.sh"
  echo "  5. In another terminal, expose the gateway:  kubectl port-forward -n openfaas svc/gateway 8080:8080"
  exit 1
fi

echo "=== 1. Database namespace and PostgreSQL ==="
kubectl apply -f k8s/database/namespace.yaml
kubectl apply -f k8s/database/secret.yaml -n database
kubectl apply -f k8s/database/service.yaml -n database
kubectl apply -f k8s/database/statefulset.yaml -n database

echo "Waiting for Postgres to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n database --timeout=120s 2>/dev/null || true

echo "=== 2. Secret for functions (openfaas-fn) ==="
kubectl create namespace "$NS_FN" 2>/dev/null || true
kubectl apply -f k8s/database/secret-functions.yaml -n "$NS_FN"

echo "=== 3. OpenFaaS functions ==="
if ! curl -sf --connect-timeout 2 "$GATEWAY/healthz" >/dev/null 2>&1 && ! curl -sf --connect-timeout 2 "$GATEWAY" >/dev/null 2>&1; then
  echo "Gateway not reachable at $GATEWAY."
  echo "Run: kubectl port-forward -n openfaas svc/gateway 8080:8080"
  exit 1
fi
PASS=$(kubectl get secret -n openfaas basic-auth -o jsonpath='{.data.basic-auth-password}' 2>/dev/null | base64 -d 2>/dev/null || true)
if [ -z "$PASS" ]; then
  echo "Get OpenFaaS password: faas-cli login -g $GATEWAY -u admin"
  exit 1
fi
echo -n "$PASS" | faas-cli login -g "$GATEWAY" -u admin --password-stdin
faas-cli deploy -f stack.yaml

echo "=== 4. Patch deployments to use DB + encryption secret ==="
for fn in generate-password twofa authenticate logout; do
  kubectl patch deployment "$fn" -n "$NS_FN" --type=json -p='[{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"postgres-credentials"}}]}]' 2>/dev/null || \
  kubectl patch deployment "$fn" -n "$NS_FN" --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"postgres-credentials"}}]}]' 2>/dev/null || true
  echo "  -> $fn"
done

echo "=== 5. Frontend (nginx + React, proxy /api to OpenFaaS) ==="
kubectl apply -f k8s/frontend/namespace.yaml
kubectl apply -f k8s/frontend/deployment.yaml -n frontend
kubectl apply -f k8s/frontend/service.yaml -n frontend
echo "  -> frontend (ALB points to this Service)"

echo "Deploy done. DB: postgres.database.svc.cluster.local | Functions: generate-password, twofa, authenticate | Frontend: frontend namespace (LoadBalancer)"
