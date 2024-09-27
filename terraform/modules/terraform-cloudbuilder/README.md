# Terraform Cloud Builder Setup

1) Clone this repository to a machine with Docker installed. Navigate to the directory: `terraform/modules/terraform-cloudbuilder`.

2) Ensure the Terraform version set in the Dockerfile, matches the version that has been used to deploy the resources thus far (i.e. `ARG TERRAFORM_VERSION=1.9.5`). You may check the version of Terraform on your local machine by running `terraform version` or you may check the `""terraform_version"` value in one of your Terraform state files.

3) Use the gcloud CLI credential helper to authenticate you to push to Artifact Registry from your local machine (this assumes you are already authenticated with gcloud by running `gcloud auth login`):
```
gcloud auth configure-docker [REGION]-docker.pkg.dev
```
where [REGION] should be the region you specified in the "bootstrap" stage when deploying the `terraform-cloudbuilder` Artifact Registry repository.

4) Run the following command to build the Terraform Cloud Builder image on your local machine. You should tag your image with the path to the `terraform-cloudbuilder` Artifact Registry repository deployed in the "bootstrap" stage. 
```
docker build -t [REGION]-docker.pkg.dev/dmo-test-higashi/terraform-cloudbuilder/terraform:[VERSION] .
```
where [VERSION] should match the version number specified in your Dockerfile (i.e. 1.9.5).

5) Run the following command to push the Terraform Cloud Builder image to the `terraform-cloudbuilder` Artifact Registry repository:
```
docker push [REGION]-docker.pkg.dev/dmo-test-higashi/terraform-cloudbuilder/terraform:[VERSION]
```