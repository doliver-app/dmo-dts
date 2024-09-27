# * Copyright 2024 Google LLC
# *
# * Licensed under the Apache License, Version 2.0 (the "License");
# * you may not use this file except in compliance with the License.
# * You may obtain a copy of the License at
# *
# *      http://www.apache.org/licenses/LICENSE-2.0
# *
# * Unless required by applicable law or agreed to in writing, software
# * distributed under the License is distributed on an "AS IS" BASIS,
# * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# * See the License for the specific language governing permissions and
# * limitations under the License.

module "project" {
  source          = "../../modules/project"
  billing_account = var.billing_account_id
  project_create  = false
  name            = var.project_id
  services        = var.bootstrap_project_services
  labels = {
    "firebase" = "enabled"
  }
}

module "tf_state_bucket" {
  source        = "../../modules/gcs"
  project_id    = module.project.project_id
  prefix        = "bkt-${var.default_prefix}"
  name          = "dts-dmo-tf-state"
  location      = var.default_region
  storage_class = "STANDARD"
  versioning    = true
}

# Cloud Build resources
module "cb_logs_bucket" {
  source        = "../../modules/gcs"
  project_id    = module.project.project_id
  prefix        = "bkt-${var.default_prefix}"
  name          = "dts-dmo-cb-logs"
  location      = var.default_region
  storage_class = "STANDARD"
  versioning    = false
}

module "cb_artifacts_bucket" {
  source        = "../../modules/gcs"
  project_id    = module.project.project_id
  prefix        = "bkt-${var.default_prefix}"
  name          = "dts-dmo-cb-artifacts"
  location      = var.default_region
  storage_class = "STANDARD"
  versioning    = false
}

# Bootstrap Service Accounts
module "bootstrap_service_accounts" {
  source                 = "../../modules/iam-service-account"
  for_each               = local.service_accounts != {} ? tomap(local.service_accounts) : {}
  project_id             = module.project.project_id
  prefix                 = each.value.prefix
  name                   = each.key
  service_account_create = true

  depends_on = [
    module.project
  ]
}

# Project IAM Bindings (Additive)
module "project_iam_additive" {
  source   = "../../modules/projects-iam"
  projects = [module.project.project_id]
  mode     = "additive"
  bindings = local.project_iam_bindings
}

# Bootstrap Service Accounts IAM
module "bootstrap_service_accounts_iam" {
  source                 = "../../modules/iam-service-account"
  for_each               = local.service_accounts != {} ? tomap(local.service_accounts) : {}
  project_id             = module.project.project_id
  prefix                 = each.value.prefix
  name                   = each.key
  service_account_create = false
  # authoritative roles granted *on* the service accounts to other identities
  iam = lookup(each.value, "sa_iam", {})
  # non-authoritative roles granted *to* the service accounts on projects
  iam_project_roles = lookup(each.value, "project_iam", {})
  # non-authoritative roles granted *to* the service accounts on storage buckets
  iam_storage_roles = lookup(each.value, "storage_iam", {})

  depends_on = [
    module.bootstrap_service_accounts,
    module.tf_state_bucket,
    module.cb_artifacts_bucket,
    module.cb_logs_bucket,
  ]
}

# Secret Manager secrets
module "secret_manager_secrets" {
  for_each   = local.secrets != {} ? tomap(local.secrets) : {}
  source     = "../../modules/secret-manager"
  project_id = module.project.project_id
  secrets = {
    "${each.key}" = {
      locations = [var.default_region]
    }
  }
  iam = {
    "${each.key}" = each.value.secret_iam != {} ? each.value.secret_iam : {}
  }

  depends_on = [
    module.bootstrap_service_accounts,
    module.bootstrap_service_accounts_iam
  ]
}

# Artifact Registry repositories
module "terraform_cloudbuilder_artifact_repo" {
  source     = "../../modules/artifact-registry"
  project_id = module.project.project_id
  location   = var.default_region
  name       = "terraform-cloudbuilder"
  format     = { docker = { standard = {} } }
  iam = {
    "roles/artifactregistry.admin" = [
      "group:allAdmins@derekmoliver.altostrat.com" #TODO: STEP 4
    ]
    "roles/artifactregistry.reader" = [
      module.bootstrap_service_accounts["container-builder"].iam_email,
    ]
  }
}

module "drive_transfer_service_artifact_repo" {
  source     = "../../modules/artifact-registry"
  project_id = module.project.project_id
  location   = var.default_region
  name       = "drive-transfer-service"
  format     = { docker = { standard = {} } }
  iam = {
    "roles/artifactregistry.admin" = [
      "group:allAdmins@derekmoliver.altostrat.com", #TODO: STEP 4
      module.bootstrap_service_accounts["drive-transfer-service-api"].iam_email,
      module.bootstrap_service_accounts["container-builder"].iam_email,
    ]
  }
}
