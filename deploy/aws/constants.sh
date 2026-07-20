# SafeRoute AWS deploy helpers (used by GitHub Actions and operators).
# Resource names only — no secrets.

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
ECR_REPOSITORY="${ECR_REPOSITORY:-saferoute}"
ECS_EXPRESS_SERVICE_NAME="${ECS_EXPRESS_SERVICE_NAME:-saferoute-web}"
HEALTH_CHECK_PATH="${HEALTH_CHECK_PATH:-/api/health}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
LOG_GROUP_NAME="${LOG_GROUP_NAME:-/ecs/saferoute-web}"
MAPBOX_SECRET_NAME="${MAPBOX_SECRET_NAME:-saferoute/mapbox-server}"
ECS_CPU="${ECS_CPU:-256}"
ECS_MEMORY="${ECS_MEMORY:-512}"
