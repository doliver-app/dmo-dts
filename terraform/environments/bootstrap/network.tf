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

# VPC Network
module "vpc" {
  source                  = "../../modules/net-vpc"
  project_id              = module.project.project_id
  name                    = "drive-transfer-service"
  vpc_create              = true
  auto_create_subnetworks = false
  subnets = [
    {
      name                  = "sn-drive-transfer-service"
      region                = var.default_region
      ip_cidr_range         = "10.7.0.0/24" #TODO: STEP 4
      enable_private_access = true
      flow_logs_config = {
        aggregation_interval = "INTERVAL_5_SEC"
        flow_sampling        = 0.5
      }
    },
    {
      name                  = "sn-kueue-nodes"
      region                = var.default_region
      ip_cidr_range         = "10.8.0.0/24" #TODO: STEP 4
      enable_private_access = true
      secondary_ip_ranges = {
        gke-kueue-autopilot-pods = "10.126.0.0/18" #TODO: STEP 4
        gke-kueue-autopilot-svcs = "10.126.64.0/18" #TODO: STEP 4
      }
      flow_logs_config = {
        aggregation_interval = "INTERVAL_5_SEC"
        flow_sampling        = 0.5
      }
    },
    {
      name                  = "sn-serverless-vpc"
      region                = var.default_region
      ip_cidr_range         = "10.9.0.0/28" #TODO: STEP 4
      enable_private_access = true
      flow_logs_config = {
        aggregation_interval = "INTERVAL_5_SEC"
        flow_sampling        = 0.5
      }
    }
  ]
}

module "firewall" {
  source     = "../../modules/net-vpc-firewall"
  project_id = module.project.project_id
  network    = module.vpc.name
  ingress_rules = {
    allow-ingress-from-iap = {
      description   = "Allow SSH access to Kueue Bastion via Identity Aware Proxy"
      source_ranges = ["35.235.240.0/20"]
      priority      = 1000
      rules = [
        {
          protocol = "tcp"
          ports    = ["22"]
        }
      ]
    }
  }
}

resource "google_vpc_access_connector" "connector" {
  project = module.project.project_id
  name    = "dts-serverless-vpc"
  region  = var.default_region
  subnet {
    project_id = module.project.project_id
    name       = "sn-serverless-vpc"
  }
  min_instances  = 2
  max_instances  = 10
  max_throughput = 1000
  machine_type   = "e2-standard-4"

  depends_on = [
    module.vpc
  ]
}

module "nat" {
  source         = "../../modules/net-cloudnat"
  project_id     = module.project.project_id
  region         = var.default_region
  name           = "${var.default_prefix}-nat"
  router_network = module.vpc.self_link
  router_create  = true
  config_source_subnetworks = {
    all = false
    subnetworks = [
      {
        self_link = "projects/${module.project.project_id}/regions/${var.default_region}/subnetworks/sn-drive-transfer-service"
      },
      {
        self_link = "projects/${module.project.project_id}/regions/${var.default_region}/subnetworks/sn-kueue-nodes"
      },
      {
        self_link = "projects/${module.project.project_id}/regions/${var.default_region}/subnetworks/sn-serverless-vpc"
      }
    ]
  }

  depends_on = [
    module.vpc
  ]
}
