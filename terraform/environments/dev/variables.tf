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

variable "project_id" {
}

variable "environment" {
}

variable "environment_project_services" {
}

variable "environment_terraform_sa_roles" {
}

variable "workflow_types" {
}

variable "job_timeout" {
  default = 604800
}

variable "rclone_transfers" {
  default = 16
}

variable "rclone_checkers" {
  default = 16
}

variable "rclone_buffer_size" {
  default = "512Mi"
}

variable "rclone_drive_chunk_size" {
  default = "512Mi"
}

variable "deduplicate_job_cpu" {
  default = "0.5"
}

variable "deduplicate_job_memory" {
  default = "512Mi"
}

variable "transfer_job_cpu" {
  default = "1"
}

variable "transfer_job_memory" {
  default = "1Gi"
}

variable "group_user_limit" {
  default = 20
}

variable "admin_queue_cpu_quota" {
  default = 10
}

variable "admin_queue_memory_quota" {
  default = "10Gi"
}

variable "admin_queue_storage_quota" {
  default = "10Gi"
}

variable "user_queue_cpu_quota" {
  default = 10
}

variable "user_queue_memory_quota" {
  default = "10Gi"
}

variable "user_queue_storage_quota" {
  default = "10Gi"
}
