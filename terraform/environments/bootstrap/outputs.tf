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

output "common_config" {
  description = "Common configuration data to be used in other steps."
  value = {
    billing_account_id   = var.billing_account_id
    default_region       = var.default_region
    default_prefix       = var.default_prefix
    bootstrap_project_id = module.project.project_id
    tf_service_account   = module.bootstrap_service_accounts["drive-transfer-service-tf"].email
    tf_state_bucket      = module.tf_state_bucket.name
    vpc_network          = module.vpc.self_link #TODO: STEP 10
  }
}

output "service_accounts" {
  value = {
    "run-dts-api" = {
      email = module.bootstrap_service_accounts["run-dts-api"].email
      iam_email = module.bootstrap_service_accounts["run-dts-api"].iam_email
    }
    "app-dts-ui" = {
      email = module.bootstrap_service_accounts["app-dts-ui"].email
      iam_email = module.bootstrap_service_accounts["app-dts-ui"].iam_email
    }
    "workflow-dts-api" = {
      email = module.bootstrap_service_accounts["workflow-dts-api"].email
      iam_email = module.bootstrap_service_accounts["workflow-dts-api"].iam_email
    }
    "rclone-admin-transfers" = {
      email = module.bootstrap_service_accounts["rclone-admin-transfers"].email
      iam_email = module.bootstrap_service_accounts["rclone-admin-transfers"].iam_email
    }
  }
}

output "secret_manager_secrets" {
  value = {
    "rclone_admin_client_id"     = module.secret_manager_secrets["rclone-admin-oauth-client-id"].secrets["rclone-admin-oauth-client-id"].name
    "rclone_admin_client_secret" = module.secret_manager_secrets["rclone-admin-oauth-client-secret"].secrets["rclone-admin-oauth-client-secret"].name
    "ui_client_id"               = module.secret_manager_secrets["rclone-ui-oauth-client-id"].secrets["rclone-ui-oauth-client-id"].name
    "ui_client_secret"           = module.secret_manager_secrets["rclone-ui-oauth-client-secret"].secrets["rclone-ui-oauth-client-secret"].name
    "group_job_user_limit"       = module.secret_manager_secrets["group-job-user-limit"].secrets["group-job-user-limit"].name
  }

}
