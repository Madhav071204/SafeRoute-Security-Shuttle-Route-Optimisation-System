# SafeRoute Express Mode create template (reference)

Use after ECR image digest and IAM roles exist.
Do not commit account-specific secret values.

```bash
aws ecs create-express-gateway-service \
  --service-name saferoute-web \
  --execution-role-arn arn:aws:iam::ACCOUNT_ID:role/SafeRouteEcsTaskExecutionRole \
  --infrastructure-role-arn arn:aws:iam::ACCOUNT_ID:role/SafeRouteEcsInfrastructureRole \
  --health-check-path /api/health \
  --cpu 256 \
  --memory 512 \
  --scaling-target minTaskCount=1,maxTaskCount=2 \
  --monitor-resources \
  --primary-container '{
    "image": "ACCOUNT_ID.dkr.ecr.ap-southeast-2.amazonaws.com/saferoute@sha256:DIGEST",
    "containerPort": 3000,
    "awsLogsConfiguration": {
      "logGroup": "/ecs/saferoute-web",
      "logStreamPrefix": "ecs"
    },
    "environment": [
      { "name": "NODE_ENV", "value": "production" }
    ],
    "secrets": [
      {
        "name": "MAPBOX_ACCESS_TOKEN",
        "valueFrom": "arn:aws:secretsmanager:ap-southeast-2:ACCOUNT_ID:secret:saferoute/mapbox-server"
      }
    ]
  }' \
  --tags key=Project,value=SafeRoute key=Purpose,value=Portfolio \
  --region ap-southeast-2
```

Describe / monitor (CLI requires service ARN):

```bash
aws ecs describe-express-gateway-service \
  --service-arn arn:aws:ecs:ap-southeast-2:ACCOUNT_ID:service/default/saferoute-web \
  --region ap-southeast-2
```

Build notes:

* Use `docker build --provenance=false --sbom=false` so ECR basic scanning
  receives a Docker v2 manifest (OCI indexes are not scannable).
* Deploy by digest, not `latest`.
