#!/usr/bin/env bash
# Wait for an ECS Express Mode service to become ACTIVE, discover its public HTTPS
# URL, and verify GET /api/health returns {"status":"ok"}.
#
# Usage:
#   ECS_EXPRESS_SERVICE_ARN=arn:aws:ecs:... HEALTH_CHECK_PATH=/api/health \
#     ./deploy/aws/wait-for-production-health.sh
#
# Optional env:
#   AWS_REGION              (default: ap-southeast-2)
#   MAX_ATTEMPTS            (default: 60)
#   POLL_INTERVAL_SECONDS   (default: 15)
#   GITHUB_OUTPUT           when set, writes service_url and service_revision

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=constants.sh
source "${SCRIPT_DIR}/constants.sh"

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
ECS_EXPRESS_SERVICE_ARN="${ECS_EXPRESS_SERVICE_ARN:?ECS_EXPRESS_SERVICE_ARN is required}"
HEALTH_CHECK_PATH="${HEALTH_CHECK_PATH:-/api/health}"
ECS_EXPRESS_SERVICE_URL="${ECS_EXPRESS_SERVICE_URL:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-15}"

extract_public_url() {
  local desc="$1"
  local url host

  url="$(echo "$desc" | grep -oE 'https://[a-zA-Z0-9._-]+\.ecs\.[a-z0-9-]+\.on\.aws' | head -n1 || true)"
  if [ -z "$url" ]; then
    url="$(echo "$desc" | grep -oE 'https://[a-zA-Z0-9._-]+\.on\.aws' | head -n1 || true)"
  fi
  if [ -z "$url" ]; then
    host="$(echo "$desc" | grep -oE '[a-zA-Z0-9._-]+\.ecs\.[a-z0-9-]+\.on\.aws' | head -n1 || true)"
    if [ -n "$host" ]; then
      url="https://${host}"
    fi
  fi
  if [ -z "$url" ] && [ -n "$ECS_EXPRESS_SERVICE_URL" ]; then
    url="${ECS_EXPRESS_SERVICE_URL%/}"
    echo "Using configured ECS_EXPRESS_SERVICE_URL fallback"
  fi
  printf '%s' "$url"
}

print_sanitised_diagnostics() {
  local desc="$1"
  local status="$2"
  local url="$3"
  echo "$desc" | jq -c --arg pollStatus "$status" --arg urlDiscovered "$([ -n "$url" ] && echo true || echo false)" '{
    serviceStatus: (.service.status.statusCode // null),
    serviceName: (.service.serviceName // null),
    activeConfigCount: ((.service.activeConfigurations // []) | length),
    onAwsEndpointCount: ([.. | strings | select(test("\\.on\\.aws$"))] | unique | length),
    pollStatus: $pollStatus,
    urlDiscovered: ($urlDiscovered == "true")
  }' 2>/dev/null || echo "{\"pollStatus\":\"${status}\",\"urlDiscovered\":$([ -n "$url" ] && echo true || echo false)}"
}

SERVICE_ACTIVE=false
URL=""
REVISION=""
LAST_FAILURE=""

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  DESC="$(aws ecs describe-express-gateway-service \
    --service-arn "${ECS_EXPRESS_SERVICE_ARN}" \
    --region "${AWS_REGION}" \
    --output json)"

  STATUS_CODE="$(echo "$DESC" | jq -r '.service.status.statusCode // empty')"
  echo "Attempt ${attempt}/${MAX_ATTEMPTS}: serviceStatus=${STATUS_CODE:-UNKNOWN}"

  if [ "$STATUS_CODE" = "ACTIVE" ]; then
    SERVICE_ACTIVE=true
    if [ -z "$URL" ]; then
      URL="$(extract_public_url "$DESC")"
      if [ -n "$URL" ]; then
        echo "Public URL discovered"
        REVISION="$(echo "$DESC" | jq -r '.service.activeConfigurations[0].serviceRevisionArn // empty')"
      else
        LAST_FAILURE="URL_TEMPORARILY_UNAVAILABLE"
        print_sanitised_diagnostics "$DESC" "active_waiting_for_url" ""
        sleep "$POLL_INTERVAL_SECONDS"
        continue
      fi
    fi

    HEALTH_URL="${URL}${HEALTH_CHECK_PATH}"
    if curl -fsS "$HEALTH_URL" -o /tmp/saferoute-health.json 2>/dev/null \
      && grep -q '"status":"ok"' /tmp/saferoute-health.json; then
      HOME_CODE="$(curl -fsS -o /dev/null -w "%{http_code}" "${URL}/" || true)"
      if [ "$HOME_CODE" = "200" ]; then
        echo "Health OK at ${URL}"
        if [ -n "${GITHUB_OUTPUT:-}" ]; then
          echo "service_url=${URL}" >> "$GITHUB_OUTPUT"
          echo "service_revision=${REVISION}" >> "$GITHUB_OUTPUT"
        fi
        exit 0
      fi
      LAST_FAILURE="HEALTH_ENDPOINT_HOMEPAGE_FAILED"
      echo "Homepage returned HTTP ${HOME_CODE} (expected 200)"
    else
      LAST_FAILURE="HEALTH_ENDPOINT_FAILURE"
      echo "Health check not ready at ${HEALTH_URL}"
    fi
  else
    LAST_FAILURE="SERVICE_NOT_ACTIVE"
    print_sanitised_diagnostics "$DESC" "waiting_for_active" ""
  fi

  sleep "$POLL_INTERVAL_SECONDS"
done

echo "Timed out after ${MAX_ATTEMPTS} attempts (${POLL_INTERVAL_SECONDS}s interval)"

case "$LAST_FAILURE" in
  SERVICE_NOT_ACTIVE)
    echo "Failure: ECS Express service did not reach ACTIVE within the timeout."
    ;;
  URL_TEMPORARILY_UNAVAILABLE|*)
    if [ "$SERVICE_ACTIVE" = true ] && [ -z "$URL" ]; then
      echo "Failure: service is ACTIVE but the public HTTPS URL never appeared in describe output."
    elif [ -n "$URL" ]; then
      echo "Failure: public URL ${URL} remained unhealthy after the timeout."
    else
      echo "Failure: deployment health gate did not complete."
    fi
    ;;
esac

exit 1
