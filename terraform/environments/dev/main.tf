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

# Import values from remote Terraform state outputs
locals {
  # Bootstrap imports
  billing_account_id           = data.terraform_remote_state.bootstrap.outputs.common_config.billing_account_id
  project_id                   = data.terraform_remote_state.bootstrap.outputs.common_config.bootstrap_project_id # TODO: Change if Bootstrap components are in a different project than Development environment resources
  default_region               = data.terraform_remote_state.bootstrap.outputs.common_config.default_region
  default_prefix               = data.terraform_remote_state.bootstrap.outputs.common_config.default_prefix
  tf_service_account           = data.terraform_remote_state.bootstrap.outputs.common_config.tf_service_account
  vpc_network                  = data.terraform_remote_state.bootstrap.outputs.common_config.vpc_network
  api_service_account          = data.terraform_remote_state.bootstrap.outputs.service_accounts.run-dts-dmo-api
  ui_service_account           = data.terraform_remote_state.bootstrap.outputs.service_accounts.app-dts-dmo-ui
  workflows_service_account    = data.terraform_remote_state.bootstrap.outputs.service_accounts.workflow-dts-dmo-api
  rclone_admin_service_account = data.terraform_remote_state.bootstrap.outputs.service_accounts.rclone-admin-transfers
  secret_manager_secrets       = data.terraform_remote_state.bootstrap.outputs.secret_manager_secrets
  app_engine_location          = local.default_region == "us-central1" ? "us-central" : local.default_region
}

# Environment Project APIs & IAM
module "project" {
  source          = "../../modules/project"
  billing_account = local.billing_account_id
  project_create  = false # Change to true if the project does not exist and needs to be created
  name            = var.project_id
  services        = var.environment_project_services
}

# Project IAM Bindings (Additive)
module "project_iam_additive" {
  source   = "../../modules/projects-iam"
  projects = [module.project.project_id]
  mode     = "additive"
  bindings = local.project_iam_bindings
}

# Environment Project Service Accounts
module "project_service_accounts" {
  source                 = "../../modules/iam-service-account"
  for_each               = local.service_accounts != {} ? tomap(local.service_accounts) : {}
  project_id             = module.project.project_id
  prefix                 = each.value.prefix
  name                   = each.key
  service_account_create = true
  # authoritative roles granted *on* the service accounts to other identities
  iam = lookup(each.value, "sa_iam", {})
  # non-authoritative roles granted *to* the service accounts on other resources
  iam_project_roles = lookup(each.value, "project_iam", {})
}

# Terraform SA IAM roles
module "tf_service_account" {
  source                 = "../../modules/iam-service-account"
  project_id             = module.project.project_id
  prefix                 = "sa"
  name                   = "drive-transfer-service-tf"
  service_account_create = false
  # non-authoritative roles granted *to* the service accounts on other resources
  iam_project_roles = {
    "${module.project.project_id}" = var.environment_terraform_sa_roles
  }
}

# Artifact Registry IAM roles
resource "google_artifact_registry_repository_iam_binding" "drive_transfer_service_repo_reader" {
  provider   = google-beta
  project    = module.project.project_id
  location   = local.default_region
  repository = "drive-transfer-service"
  role       = "roles/artifactregistry.reader"
  members = [
    "principal://iam.googleapis.com/projects/${module.project.number}/locations/global/workloadIdentityPools/${module.project.project_id}.svc.id.goog/subject/ns/dts-dmo-admin/sa/sa-rclone-admin-transfers"
  ]

  depends_on = [
    module.kueue_autopilot_cluster
  ]
}

# Cloud Deploy Pipeline IAM roles
resource "google_storage_bucket_iam_member" "cloud_deploy_bucket_iam" {
  bucket = "${local.default_region}.deploy-artifacts.${module.project.project_id}.appspot.com"
  role   = "roles/storage.admin"
  member = "serviceAccount:sa-drive-transfer-service-cd@${module.project.project_id}.iam.gserviceaccount.com"
}

# Secret Manager secrets
module "secret_manager_secrets" {
  for_each   = local.secrets != {} ? tomap(local.secrets) : {}
  source     = "../../modules/secret-manager"
  project_id = module.project.project_id
  secrets = {
    "${each.key}" = {
      locations = [local.default_region]
    }
  }
  iam = {
    "${each.key}" = each.value.secret_iam != {} ? each.value.secret_iam : {}
  }

  depends_on = [
    module.project_service_accounts,
    module.kueue_autopilot_cluster
  ]
}

# IAP OAuth Client ID / Secret
data "google_secret_manager_secret_version" "ui_oauth_client_id" {
  project = module.project.project_id
  secret  = "rclone-ui-oauth-client-id"
  version = "latest"
}

data "google_secret_manager_secret_version" "ui_oauth_client_secret" {
  project = module.project.project_id
  secret  = "rclone-ui-oauth-client-id"
  version = "latest"
}

# Frontend UI - App Engine Application 
resource "google_app_engine_application" "app" {
  project       = module.project.project_id
  location_id   = local.app_engine_location
  database_type = "CLOUD_FIRESTORE"
  iap {
    enabled              = true
    oauth2_client_id     = data.google_secret_manager_secret_version.ui_oauth_client_id.secret_data
    oauth2_client_secret = data.google_secret_manager_secret_version.ui_oauth_client_secret.secret_data
  }
}

# Default App Engine Service Account IAM roles
resource "google_service_account_iam_member" "app_engine_service_account_iam" {
  service_account_id = "projects/${module.project.project_id}/serviceAccounts/${module.project.project_id}@appspot.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:cb-drive-transfer-service-ui@${module.project.project_id}.iam.gserviceaccount.com"

  depends_on = [
    google_app_engine_application.app
    ]
}

# Firebase
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = module.project.project_id

  depends_on = [
    module.project,
    module.project_service_accounts
  ]
}

# Firestore Database
resource "google_firestore_database" "database" {
  project                 = module.project.project_id
  name                    = "dts-dmo-${var.environment}"
  location_id             = "nam5"
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  depends_on = [
    google_firebase_project.default
  ]
}

# Creates a ruleset of Firestore Security Rules from a local file.
resource "google_firebaserules_ruleset" "firestore_ruleset" {
  provider = google-beta
  project  = module.project.project_id
  source {
    files {
      name = "firestore.rules"
      # Write security rules in a local file named "firestore.rules".
      # Learn more: https://firebase.google.com/docs/firestore/security/get-started
      content = file("${path.module}/assets/firestore.rules")
    }
  }

  # Wait for Firestore to be provisioned before creating this ruleset.
  depends_on = [
    google_firestore_database.database,
  ]
}

# Releases the ruleset for the Firestore instance.
resource "google_firebaserules_release" "firestore_rules_release" {
  provider     = google-beta
  name         = "cloud.firestore" # must be cloud.firestore
  ruleset_name = google_firebaserules_ruleset.firestore_ruleset.name
  project      = module.project.project_id

  # Wait for Firestore to be provisioned before releasing the ruleset.
  depends_on = [
    google_firestore_database.database,
  ]
}

resource "google_firestore_index" "job_history_index" {
  project     = module.project.project_id
  database    = google_firestore_database.database.name
  collection  = "jobs"
  query_scope = "COLLECTION"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "job_started"
    order      = "DESCENDING"
  }
}

# Rclone Config - GCS Bucket
module "rclone_config_bucket" {
  source        = "../../modules/gcs"
  project_id    = module.project.project_id
  prefix        = "bkt-${local.default_prefix}"
  name          = "rclone-config-mount"
  location      = local.default_region
  storage_class = "STANDARD"
  versioning    = true
  iam = {
    "roles/storage.admin" = [
      "principal://iam.googleapis.com/projects/${module.project.number}/locations/global/workloadIdentityPools/${module.project.project_id}.svc.id.goog/subject/ns/dts-dmo-admin/sa/sa-rclone-admin-transfers",
      local.api_service_account.iam_email
    ]
  }

  depends_on = [
    module.kueue_autopilot_cluster
  ]
}

# Kueue Cluster Config - GCS Bucket
module "kueue_cluster_config_bucket" {
  source        = "../../modules/gcs"
  project_id    = module.project.project_id
  prefix        = "bkt-${local.default_prefix}"
  name          = "kueue-cluster-config"
  location      = local.default_region
  storage_class = "STANDARD"
  versioning    = true
  iam = {
    "roles/storage.admin" = [
      module.project_service_accounts["kueue-bastion-host"].iam_email
    ]
  }

  depends_on = [
    module.project_service_accounts
  ]
}

# Upload Kueue Cluster Configs - GCS Objects
resource "google_storage_bucket_object" "kueue_cluster_config_object" {
  for_each = fileset("${path.module}/assets/cluster-config", "*.yaml")
  bucket   = module.kueue_cluster_config_bucket.id
  name     = each.value
  content = templatefile(
    "${path.module}/assets/cluster-config/${each.value}",
    {
      admin_queue_cpu_quota     = var.admin_queue_cpu_quota,
      admin_queue_memory_quota  = var.admin_queue_memory_quota,
      admin_queue_storage_quota = var.admin_queue_storage_quota,
      user_queue_cpu_quota      = var.user_queue_cpu_quota,
      user_queue_memory_quota   = var.user_queue_memory_quota,
      user_queue_storage_quota  = var.user_queue_storage_quota,
    }
  )
  content_type = "application/x-yaml"

  depends_on = [
    module.kueue_cluster_config_bucket
  ]
}

# Kueue GKE Autopilot Cluster - Cluster
module "kueue_autopilot_cluster" {
  source          = "../../modules/gke-cluster-autopilot"
  project_id      = module.project.project_id
  name            = "kueue-autopilot"
  location        = local.default_region
  release_channel = "RAPID"
  vpc_config = {
    network    = "projects/${module.project.project_id}/global/networks/drive-transfer-service"
    subnetwork = "projects/${module.project.project_id}/regions/${local.default_region}/subnetworks/sn-kueue-nodes"
    secondary_range_names = {
      pods     = "gke-kueue-autopilot-pods"
      services = "gke-kueue-autopilot-svcs"
    }
    master_authorized_ranges = {
      sn-drive-transfer-service = "10.7.0.0/24" #TODO: STEP 4
    }
  }
  private_cluster_config = {
    enable_private_endpoint = false
    master_global_access    = false
  }
  node_config = {
    service_account = module.project_service_accounts["kueue-cluster-nodes"].email
  }
  enable_features = {
    allow_net_admin = false
    secret_manager  = true
    gateway_api     = true
    dns = {
      provider = "CLOUD_DNS"
      scope    = "CLUSTER_SCOPE"
      domain   = "cluster.local"
    }
    vertical_pod_autoscaling = true
  }
  enable_addons = {
    cloudrun         = false
    config_connector = false
    kalm             = false
  }

  backup_configs = {
    enable_backup_agent = false
  }

  monitoring_config = {
    enable_managed_prometheus  = true
    enable_daemonset_metrics   = true
    enable_deployment_metrics  = true
    enable_hpa_metrics         = true
    enable_pod_metrics         = true
    enable_statefulset_metrics = true
    enable_storage_metrics     = true
  }

  depends_on = [
    module.project_service_accounts
  ]
}

# Force recreation of Bastion Host if Kueue Cluster Configs have changed
locals {
  kueue_configs_concat = join("\n", [
    for conf in fileset(".", "${path.module}/assets/cluster-config/*.yaml") : file(conf)
  ])
  kueue_configs_hash = base64sha512(local.kueue_configs_concat)
}

# Kueue GKE Autopilot Cluster - Bastion Host Compute Engine Instance
module "kueue_autopilot_cluster_bastion_host" {
  source        = "../../modules/compute-vm"
  project_id    = module.project.project_id
  zone          = "${local.default_region}-b"
  name          = "kueue-bastion"
  description   = "Kueue Config SHA512 Hash (base64): ${local.kueue_configs_hash}"
  instance_type = "e2-standard-16"
  iam = {
    "roles/compute.instanceAdmin" = [
      "group:allAdmins@derekmoliver.altostrat.com" #TODO: STEP 4
    ]
  }
  network_interfaces = [{
    network    = "projects/${module.project.project_id}/global/networks/drive-transfer-service"
    subnetwork = "projects/${module.project.project_id}/regions/${local.default_region}/subnetworks/sn-drive-transfer-service"
  }]
  boot_disk = {
    initialize_params = {
      image = "projects/debian-cloud/global/images/debian-12-bookworm-v20240617"
      size  = 100
      type  = "pd-balanced"
    }
  }
  metadata = {
    startup-script = templatefile(
      "${path.module}/assets/startup-script.sh",
      {
        project_id = module.project.project_id,
        region     = local.default_region,
        prefix     = local.default_prefix
      }
    )
  }
  service_account = {
    email = module.project_service_accounts["kueue-bastion-host"].email
  }

  depends_on = [
    module.kueue_autopilot_cluster,
    google_storage_bucket_object.kueue_cluster_config_object,
    module.project_service_accounts
  ]
}

# Drive Transfer Service API - Cloud Run / Private DNS
module "rclone_api_cloud_run" {
  source     = "../../modules/cloud-run-v2"
  project_id = module.project.project_id
  name       = "drive-transfer-service-api"
  region     = local.default_region
  containers = {
    api = {
      image = "${local.default_region}-docker.pkg.dev/${module.project.project_id}/drive-transfer-service/api:latest"
      ports = {
        http1 = {
          container_port = 8080
          name           = "http1"
        }
      }
      env = {
        PROJECT_ID           = module.project.project_id
        ENVIRONMENT          = var.environment
        REGION               = local.default_region
        CLOUD_RUN_SA         = local.api_service_account.email
        RCLONE_ADMIN_SA      = local.rclone_admin_service_account.email
        RCLONE_CONFIG_BUCKET = module.rclone_config_bucket.name
      }
      env_from_key = {
        OAUTH_CLIENT_ID = {
          secret  = local.secret_manager_secrets["rclone_admin_client_id"]
          version = "latest"
        }
        OAUTH_CLIENT_SECRET = {
          secret  = local.secret_manager_secrets["rclone_admin_client_secret"]
          version = "latest"
        }
        GROUP_USER_LIMIT = {
          secret = local.secret_manager_secrets["group_job_user_limit"]
          version = "latest"
        }
      }
    }
  }
  iam = {
    "roles/run.invoker" = [
      local.api_service_account.iam_email,
      local.ui_service_account.iam_email,
      local.workflows_service_account.iam_email,
    ]
  }
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  revision = {
    gen2_execution_environment = true
    max_concurrency            = 80
    max_instance_count         = 100
    min_instance_count         = 2
    vpc_access = {
      egress = "PRIVATE_RANGES_ONLY"
      subnet = "sn-drive-transfer-service"
    }
  }
  service_account_create = false
  service_account        = local.api_service_account.email
}

module "private_dns" {
  source     = "../../modules/dns"
  project_id = module.project.project_id
  name       = "private-cloud-run"
  zone_config = {
    domain = "a.run.app."
    private = {
      client_networks = [local.vpc_network]
    }
  }

  depends_on = [
    module.rclone_api_cloud_run
  ]
}

resource "google_dns_record_set" "dns_record_set" {
  project      = module.project.project_id
  managed_zone = module.private_dns.name
  name         = "${trimprefix(module.rclone_api_cloud_run.service_uri, "https://")}."
  type         = "A"
  ttl          = 60
  rrdatas      = ["199.36.153.8", "199.36.153.9", "199.36.153.10", "199.36.153.11"]

  depends_on = [
    module.private_dns,
    module.rclone_api_cloud_run
  ]
}

# Rclone Workflow Configuration
resource "google_workflows_workflow" "rclone_workflows" {
  for_each        = toset(var.workflow_types)
  project         = module.project.project_id
  name            = "${each.value}-rclone-job-workflow"
  region          = local.default_region
  description     = "This workflow will be initiated when the source is of type: ${each.value}"
  service_account = local.workflows_service_account.email
  call_log_level  = "LOG_ALL_CALLS"
  user_env_vars = {
    API_ENDPOINT            = "https://drive-transfer-service-api-${module.project.number}.${local.default_region}.run.app"
    AR_REGION               = local.default_region
    AR_REPO                 = "drive-transfer-service"
    CLUSTER_LOCATION        = local.default_region
    CLUSTER_NAME            = module.kueue_autopilot_cluster.name
    CONFIG_BUCKET           = module.rclone_config_bucket.name
    JOB_TIMEOUT             = var.job_timeout
    RCLONE_TRANSFERS        = var.rclone_transfers
    RCLONE_CHECKERS         = var.rclone_checkers
    RCLONE_BUFFER_SIZE      = var.rclone_buffer_size
    RCLONE_DRIVE_CHUNK_SIZE = var.rclone_drive_chunk_size
    DEDUPE_JOB_CPU          = var.deduplicate_job_cpu
    DEDUPE_JOB_MEMORY       = var.deduplicate_job_memory
    TRANSFER_JOB_CPU        = var.transfer_job_cpu
    TRANSFER_JOB_MEMORY     = var.transfer_job_memory
  }
  source_contents = file("${path.module}/assets/workflow_${each.value}.yaml")
}
