# Drive Transfer Service: Project Environment

1) Before running this deployment, please complete the following pre-requisites:

    1.1. Follow the steps in [terraform/environments/bootstrap/README.md](../bootstrap/README.md)

    1.2. In the Google Cloud Console, navigate to "Secret Manager" and create new Secret Versions for the following Secrets. You can find the values to populate these secrets in the "APIs & Services" -> "Credentials" screen:
    - `rclone-admin-oauth-client-id` (Drive Transfer Service API - Admin Transfers Client ID)
    - `rclone-admin-oauth-client-secret` (Drive Transfer Service API - Admin Transfers Client Secret)
    - `rclone-ui-oauth-client-id` (Drive Transfer Service UI - IAP/Auth Client ID)
    - `rclone-ui-oauth-client-secret` (Drive Transfer Service UI - IAP/Auth Client Secret)
    - `group-job-user-limit` (Number of users allowed in a Google Group transfer job)

    1.3. Run the `dev-terraform-apply-deploy` Cloud Build trigger. You can manually run the trigger from the GCP console > “Cloud Build” > “Triggers”.

2) You may proceed to the next step in the Deployment Guide.