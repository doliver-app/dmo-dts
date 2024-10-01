# Drive Transfer Service: Project Bootstrap

1) To run the Drive Transfer Service "Bootstrap" step, your user should have the following IAM roles on the existing project:
- Cloud Build Editor
- Storage Admin
- Service Usage Admin
- Secret Manager Admin
- Artifact Registry Admin
- Service Account Admin
- Project IAM Admin
- OAuth Config Editor

2) From your local machine, authenticate through the `gcloud` CLI:
```
gcloud auth login
gcloud auth application-default login
gcloud config set project dmo-test-higashi
```

3) [Install Terraform](https://developer.hashicorp.com/terraform/install) and also [install tfenv](https://github.com/tfutils/tfenv) package to make it easier to switch to the correct version of Terraform (1.9.5). Run the following commands:
```
tfenv install 1.9.5
tfenv use 1.9.5
```

4) Do a "find-and-replace" in the  repository for the below values. Most of the values are also marked with `#TODO: STEP 4`. Do not replace any values in the `terraform/modules/` directories:
- `01C728-C73DD8-AB1248` (Can be found in GCP Console -> Billing, i.e. `XXXXXX-XXXXXX-XXXXXX`)
- `dmo-test-higashi` (Can be found in GCP Console -> Cloud overview -> Dashboard)
- `48703874495` (Can be found in GCP Console -> Cloud overview -> Dashboard)
- `derekmoliver.altostrat.com` (Domain associated with the Google Workspace instance, i.e. `example.com`)
- `allAdmins@derekmoliver.altostrat.com` (Google Group email address that contains "admin" users, i.e. `drive-transfer-service-admins@example.com`)
- `us-central1` (GCP region where you would like to deploy your resources, i.e. `us-central1`)
- `gts` (3-7 character prefix that will be used to name some resources, i.e. `dts`)
- `dev` (the environment you will be deploying this solution to, i.e. `dev`, `uat`, `prod`)

You also should set IP CIDR block values in `terraform/environments/bootstrap/networks.tf.example` so they do not overlap with existing subnets.

5) Rename the `terraform/environments/env` directory to `terraform/environments/dev`.

6) From within the `terraform/environments/bootstrap/` directory, run the following:
```
terraform init
terraform plan
terraform apply
```
The output should look like this:
```
Outputs:

common_config = {
  "billing_account_id" = "01C728-C73DD8-AB1248"
  "bootstrap_project_id" = "dmo-test-higashi"
  "default_prefix" = "gts"
  "default_region" = "us-central1"
  "tf_service_account" = "sa-drive-transfer-service-tf@dmo-test-higashi.iam.gserviceaccount.com"
  "tf_state_bucket" = "bkt-gts-dts-tf-state"
}
secret_manager_secrets = {
  ...
}
service_accounts = {
  ...
}
```

7) This step enabled a set of APIs on your project, created a Terraform service account (among others) and granted them a set of IAM roles on the project, and created a Google Cloud Storage bucket to store the Terraform state files. It also creates a set of Secret Manager secrets and Artifact Registry repositories to hold our container images.

8) Remove the `.example` suffix from `backend.tf` and make sure the `bucket` attribute matches the `tf_state_bucket` value in previous command output.

9) In `terraform.tfvars` uncomment the `terraform_sa` line (marked with `#TODO: STEP 9`)  and make sure the email matches the `tf_service_account` value in previous command output. Remove the `.example` suffix from `providers.tf`.

10) Remove the `.example` suffix from the `network.tf` file. Uncomment the `vpc_network` attribute in `outputs.tf` (marked with `#TODO: STEP 10`)

11) Setup the CI/CD pipelines for the Terraform, API, and UI. CI/CD pipelines are defined for either Secure Source Manager, Github, or Gitlab Enterprise. Remove the `.example` suffix **ONLY** from the appropriate `cloudbuild_*.tf` file (Secure Source Manager does not have one as the triggers are defined in `.cloudbuild/triggers.yaml`), populate the appropriate Secret Manager secrets, and replace any placeholder values:

### Secure Source Manager:
a. Ensure you have a [Secure Source Manager instance provisioned](https://cloud.google.com/secure-source-manager/docs/create-instance) for your organization.
b. Uncomment "securesourcemanager.googleapis.com" in `terraform.tfvars`. Remove the commented lines from the following files marked `#TODO: STEP 11`:
- `assets/iam.yaml`
- `assets/sa.yaml`
c. The Cloud Build triggers for Secure Source Manager are defined in `.cloudbuild/triggers.yaml`. Simply push your repository to the remote `main` branch for the Cloud Build triggers to run:
```
git add .
git commit -m "Initial commit"
git push origin main
```

### Github (`cloudbuild_github.tf`):
a. [Install the Cloud Build GitHub App](https://github.com/apps/google-cloud-build) on your GitHub account or in an organization you own.
b. [Create a personal access token (classic)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). Make sure to set your token to have no expiration date and select the following permissions when prompted in GitHub: `repo` and `read:user`. If your app is installed in an organization, make sure to also select the `read:org` permission.
c. Save this value in the `github-pat` Secret Manager secret.
d. Replace the following placeholders in `cloudbuild_github.tf`:
- `doliver-app`
- `dmo-dts`
- `https://github.com/doliver-app/dmo-dts.git`
- `55494224` (Installation ID of your Cloud Build GitHub app. Your installation ID can be found in the URL of your Cloud Build GitHub App. You can find this value by navigating to your repository's "Settings" > "GitHub Apps" > "Google Cloud Build" > "Configure". In the URL, `https://github.com/settings/installations/1234567`, the installation ID is the numerical value `1234567`)
e. Navigate to `https://console.cloud.google.com/cloud-build/triggers;region=global/connect?project=48703874495` to finish connecting Github to your project. Ensure you select the same region for the connection as the triggers (i.e. us-central1).

### Gitlab Enterprise (`cloudbuild_gitlab.tf`):
a. On the GitLab Enterprise Edition page for your instance, click on your avatar in the upper-right corner. Click Edit profile, then select Access tokens.
b. Create an access token with the `api` scope to use for connecting and disconnecting repositories. Save this value in the `gitlab-api-pat` Secret Manager secret.
c. Create another access token with the `read_api` scope to ensure Cloud Build repositories can access source code in repositories. Save this value in the `gitlab-read-pat` Secret Manager secret.
d. Create a random 20 character string by running the below command (on a Mac) and save this value in the `gitlab-webhook-secret` Secret Manager secret.
```
openssl rand -base64 20 |md5 |head -c20;echo
```
e. Replace the following placeholders in `cloudbuild_gitlab.tf`:
- `[GITLAB_HOST_URI]`
- `[GITLAB_REPO_URI]`

12) From within the `terraform/environments/bootstrap/` directory, run the `terraform init` command again. You will get a messsage asking if you want to migrate the Terraform state. Enter `yes ` and then Enter.
```
Initializing the backend...
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "gcs" backend. No existing state was found in the newly
  configured "gcs" backend. Do you want to copy this state to the new "gcs"
  backend? Enter "yes" to copy and "no" to start with an empty state.

  Enter a value:
```

Then proceed running:
```
terraform plan
terraform apply
```

13) Push the entire local repository to your remote repository's `main` branch and ensure the Cloud Build triggers automatically start. It is ok if most of the Cloud Build Triggers fail. The most important triggers to succed at this step are the `drive-transfer-service-api-deploy`, `terraform-builder-deploy`, and  `gcs-fuse-sidecar-deploy` triggers. You may proceed to the next step in the Deployment Guide.