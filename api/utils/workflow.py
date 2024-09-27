#  * Copyright 2024 Google LLC
#  *
#  * Licensed under the Apache License, Version 2.0 (the "License");
#  * you may not use this file except in compliance with the License.
#  * You may obtain a copy of the License at
#  *
#  *      http://www.apache.org/licenses/LICENSE-2.0
#  *
#  * Unless required by applicable law or agreed to in writing, software
#  * distributed under the License is distributed on an "AS IS" BASIS,
#  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  * See the License for the specific language governing permissions and
#  * limitations under the License.

# Python Imports
import os
import importlib.util
import logging
import json
# Flask Imports
from flask import jsonify
# Google Cloud Imports
from google.cloud import workflows_v1
from google.cloud.workflows import executions_v1
from google.cloud.workflows.executions_v1.types import Execution
from google.cloud.workflows.executions_v1.types import executions

# Custom Type Imports
#from ..types import jobs
jobs_spec=importlib.util.spec_from_file_location("jobs","/app/types/jobs.py")
jobs = importlib.util.module_from_spec(jobs_spec)
jobs_spec.loader.exec_module(jobs)

# Set up API clients.
execution_client = executions_v1.ExecutionsClient()
workflows_client = workflows_v1.WorkflowsClient()

project_id = os.environ.get("PROJECT_ID")
region = os.environ.get("REGION")

def submit_cloud_workflow(user_id, environment, src_type, job_id, job, has_children):
    logging.info(f"Building Cloud Workflow execution runtime arguments...")

    runtime_args={
        "environment": environment,
        "user_id": user_id,
        "user_type": job.get("user_type"),
        "job_id": job_id,
        "job_type": job.get("job_type"),
        "drive_type": job.get("src_type"),
        "src_config_ref": job.get("src_config").path,
        "dst_config_ref": job.get("dst_config").path,
        "has_children": has_children,
        "notify_users": job.get("notify_users")
    }

    logging.info(f"Workflows Runtime Args: {runtime_args}")

    # Construct the fully qualified location path.
    parent = workflows_client.workflow_path(project_id, region, f"{src_type}-rclone-job-workflow")

    request = executions_v1.CreateExecutionRequest(
        parent=parent,
        execution=Execution(
            argument=json.dumps(runtime_args)
        )
    )

    # Execute the workflow.
    response = execution_client.create_execution(request=request)
    print(f"Created execution: {response.name}")

    return response.name
