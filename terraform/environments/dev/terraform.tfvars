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

project_id  = "dmo-test-higashi"  #TODO: STEP 4
environment = "dev" #TODO: STEP 4
environment_project_services = [
  "admin.googleapis.com",
  "appengine.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "compute.googleapis.com",
  "container.googleapis.com",
  "containerfilesystem.googleapis.com",
  "dns.googleapis.com",
  "drive.googleapis.com",
  "firestore.googleapis.com",
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "iap.googleapis.com",
  "logging.googleapis.com",
  "monitoring.googleapis.com",
  "pubsub.googleapis.com",
  "run.googleapis.com",
  "secretmanager.googleapis.com",
  "serviceusage.googleapis.com",
  "stackdriver.googleapis.com",
  "storage.googleapis.com",
  "vpcaccess.googleapis.com",
  "workflows.googleapis.com",
  "workflowexecutions.googleapis.com"
]
environment_terraform_sa_roles = [
  "roles/appengine.appAdmin",
  "roles/appengine.appCreator",
  "roles/datastore.owner",
  "roles/container.admin",
  "roles/compute.admin",
  "roles/iam.serviceAccountAdmin",
  "roles/resourcemanager.projectIamAdmin",
  "roles/run.admin",
  "roles/secretmanager.admin",
  "roles/storage.admin",
  "roles/workflows.admin"
]
workflow_types = [
  "shared",
  "mydrive",
  "group"
]
# Resource Allocation
job_timeout = 604800
rclone_transfers = 16
rclone_checkers = 16
rclone_buffer_size = "512Mi"
rclone_drive_chunk_size = "512Mi"
deduplicate_job_cpu = "0.5"
deduplicate_job_memory = "512Mi"
transfer_job_cpu = "1"
transfer_job_memory = "1Gi"
group_user_limit = 20
admin_queue_cpu_quota = 10
admin_queue_memory_quota = "10Gi"
admin_queue_storage_quota = "10Gi"
user_queue_cpu_quota = 10
user_queue_memory_quota = "10Gi"
user_queue_storage_quota = "10Gi"
