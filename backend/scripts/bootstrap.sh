#!/usr/bin/env bash
set -euo pipefail

# Run in the VPS directory containing its compose.yaml and .env.
email="${1:-hoangphatnguyen1208@gmail.com}"
hotels="${2:-20}"
days="${3:-90}"
if (( $# > 3 )) || [[ ! "$hotels" =~ ^[0-9]{1,3}$ || ! "$days" =~ ^[0-9]{1,3}$ ]] ||
   (( 10#$hotels < 1 || 10#$hotels > 100 || 10#$days < 1 || 10#$days > 366 )); then
  echo 'Usage: bash bootstrap.sh [admin-email] [hotels:1-100] [days:1-366]' >&2
  exit 1
fi
command -v docker >/dev/null
docker compose config --quiet
echo 'Pulling backend image and waiting for readiness...'
docker compose pull backend
docker compose up -d --no-build --wait --wait-timeout 180 backend

echo "Creating/granting admin access for $email (existing password stays unchanged)."
# Password is read only if the account is missing; do not echo it on a terminal.
if [[ -t 0 ]]; then
  terminal_state="$(stty -g)"
  trap 'stty "$terminal_state" 2>/dev/null || true' EXIT
  stty -echo
fi
docker compose exec -T backend /app/admin -email "$email" -create
if [[ -t 0 ]]; then
  stty "$terminal_state"
  trap - EXIT
fi

docker compose exec -T backend /app/seed -owner-email "$email" -hotels "$hotels" -days "$days"
echo 'Admin and sample hotels/rooms are ready. Log in again to load admin permissions.'
