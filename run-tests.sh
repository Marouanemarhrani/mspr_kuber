#!/usr/bin/env bash
# Smoke test for TP: generate-password -> twofa -> authenticate.
set -e
GATEWAY="${GATEWAY:-http://127.0.0.1:8080}"
USER="testuser-$(date +%s)"

echo "1. generate-password (create user + password + QR)..."
R1=$(curl -s -X POST "$GATEWAY/function/generate-password" -H "Content-Type: application/json" -d "{\"username\":\"$USER\"}")
echo "$R1" | head -c 120
echo "..."

echo ""
echo "2. twofa (generate 2FA secret + QR)..."
R2=$(curl -s -X POST "$GATEWAY/function/twofa" -H "Content-Type: application/json" -d "{\"username\":\"$USER\"}")
echo "$R2" | head -c 120
echo "..."

PASS=$(echo "$R1" | sed -n 's/.*"password":"\([^"]*\)".*/\1/p')
echo ""
echo "3. authenticate (login + password + 2FA)..."
echo "   Use a TOTP app to get code for $USER, then:"
echo "   curl -X POST $GATEWAY/function/authenticate -H 'Content-Type: application/json' -d '{\"username\":\"$USER\",\"password\":\"$PASS\",\"code\":\"YOUR_TOTP_CODE\"}'"
echo ""
echo "   Quick check (no 2FA): POST authenticate with username+password only (fails if 2FA set):"
curl -s -X POST "$GATEWAY/function/authenticate" -H "Content-Type: application/json" -d "{\"username\":\"$USER\",\"password\":\"wrong\"}" | head -c 200
echo ""
echo "4. logout (stateless ack)..."
curl -s -X POST "$GATEWAY/function/logout" -H "Content-Type: application/json" -d '{}' | head -c 80
echo ""
echo "Done. User $USER created; password in response above."
