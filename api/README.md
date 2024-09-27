# Drive Transfer Service API

Flask API that accepts config and job parameters and invokes Rclone jobs through Cloud Workflows.

Changes to files in this directory will kick off the Cloud Build trigger `drive-transfer-service-api-deploy` which will build the latest Docker image, store it in Artifact Registry, and create a new Cloud Deploy release that can be promoted across a Cloud Run instance within each environment