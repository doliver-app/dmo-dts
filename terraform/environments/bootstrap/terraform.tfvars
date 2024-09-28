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

billing_account_id = "01C728-C73DD8-AB1248" #TODO: STEP 4
project_id         = "dmo-test-higashi"         #TODO: STEP 4
environment        = "dev"        #TODO: STEP 4
default_region     = "us-west1"     #TODO: STEP 4
default_prefix     = "dts-dmo"             #TODO: STEP 4
terraform_sa       = "sa-drive-transfer-service-tf@dmo-test-higashi.iam.gserviceaccount.com" #TODO: STEP 9
bootstrap_project_services = [
  "artifactregistry.googleapis.com",
  "cloudidentity.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "compute.googleapis.com",
  "cloudbuild.googleapis.com",
  "clouddeploy.googleapis.com",
  "dns.googleapis.com",
  "firebase.googleapis.com",
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "logging.googleapis.com",
  "monitoring.googleapis.com",
  "networkmanagement.googleapis.com",
  "secretmanager.googleapis.com",
  # "securesourcemanager.googleapis.com", # ONLY UNCOMMENT IF SSM IS ENABLED FOR YOUR PROJECT
  "servicenetworking.googleapis.com",
  "serviceusage.googleapis.com",
  "stackdriver.googleapis.com",
  "storage.googleapis.com",
  "vpcaccess.googleapis.com"
]
terraform_environments = [
  "bootstrap",
  "dev", #TODO: STEP 4
]
