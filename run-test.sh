#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "Tempo K6 Load Test Launcher"
echo "============================================"

k6 version

show_help() {
  cat << EOF

Usage examples:

  # Static constant load
  ./run-tempo-test.sh medium
  ./run-tempo-test.sh high
  ./run-tempo-test.sh chaos

  # Ramping / realistic traffic
  ./run-tempo-test.sh spike          # Black Friday spike
  ./run-tempo-test.sh ramp_sustain   # Gradual ramp + sustain + down
  ./run-tempo-test.sh canary         # 2-hour gradual rollout

  # Production with mTLS
  ./run-tempo-test.sh high https://tempo.example.com NEO ./certs/client.pem ./certs/client-key.pem

EOF
  exit 0
}

PROFILE="${1:-medium}"
shift || true

TEMPO_URL="${1:-${TEMPO_URL:-http://localhost:3200}}"; shift || true
TENANT_ID="${1:-${TENANT_ID:-1}}"; shift || true
TLS_CERT="${1:-}"; shift || true
TLS_KEY="${1:-}"; shift || true

if [[ "$PROFILE" == "-h" || "$PROFILE" == "--help" ]]; then
  show_help
fi

# Detect if profile is ramping
if [[ "$PROFILE" =~ ^(spike|ramp_sustain|canary)$ ]]; then
  USE_RAMPING=true
else
  USE_RAMPING=false
fi

echo "Profile: $PROFILE $( [ "$USE_RAMPING" = true ] && echo "(ramping)" || echo "(static)" )"
echo "Tempo URL: $TEMPO_URL"
echo "Tenant: $TENANT_ID"
[ -n "$TLS_CERT" ] && echo "mTLS enabled"

# === 5. Build k6 command ===
K6_CMD="k6 run script.ts"
K6_CMD="$K6_CMD -e PROFILE=$PROFILE"
K6_CMD="$K6_CMD -e USE_RAMPING=$USE_RAMPING"
K6_CMD="$K6_CMD -e TEMPO_URL=$TEMPO_URL"
K6_CMD="$K6_CMD -e TENANT_ID=$TENANT_ID"

if [ -n "$TLS_CERT" ] && [ -n "$TLS_KEY" ]; then
  K6_CMD="$K6_CMD -e TLS_CERT=$TLS_CERT -e TLS_KEY=$TLS_KEY"
fi

echo "============================================"
echo "Starting load test..."
echo "$K6_CMD"
echo "============================================"

exec $K6_CMD