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
import re
import json
import datetime
import importlib.util
import logging
# Flask Imports
from flask import Flask, request, jsonify
# Google Cloud Imports
from firebase_admin import firestore, initialize_app
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.document import DocumentReference
import google.cloud.logging
# Custom Type Imports
configs_spec=importlib.util.spec_from_file_location("configs","types/configs.py")
jobs_spec=importlib.util.spec_from_file_location("jobs","types/jobs.py")
configs = importlib.util.module_from_spec(configs_spec)
jobs = importlib.util.module_from_spec(jobs_spec)
configs_spec.loader.exec_module(configs)
jobs_spec.loader.exec_module(jobs)
# Custom Utility Imports
admin_spec=importlib.util.spec_from_file_location("admin","utils/admin.py")
drive_spec=importlib.util.spec_from_file_location("drive","utils/drive.py")
rclone_spec=importlib.util.spec_from_file_location("rclone","utils/rclone.py")
workflow_spec=importlib.util.spec_from_file_location("kueue","utils/workflow.py")
notification_spec=importlib.util.spec_from_file_location("notification","utils/notification.py")
admin = importlib.util.module_from_spec(admin_spec)
drive = importlib.util.module_from_spec(drive_spec)
rclone = importlib.util.module_from_spec(rclone_spec)
workflow = importlib.util.module_from_spec(workflow_spec)
notification = importlib.util.module_from_spec(notification_spec)
admin_spec.loader.exec_module(admin)
drive_spec.loader.exec_module(drive)
rclone_spec.loader.exec_module(rclone)
workflow_spec.loader.exec_module(workflow)
notification_spec.loader.exec_module(notification)

# Initialize Flask App
app = Flask(__name__)

# Initialize Google Cloud Logging Client
logging_client = google.cloud.logging.Client()
logging_client.setup_logging()

# Initialize Firestore DB
project_id = os.environ.get("PROJECT_ID")
environment = os.environ.get("ENVIRONMENT")
region = os.environ.get("REGION")
cloud_run_sa = os.environ.get("CLOUD_RUN_SA")
rclone_admin_sa = os.environ.get("RCLONE_ADMIN_SA")
group_user_limit = os.environ.get("GROUP_USER_LIMIT")

environment_app = initialize_app(name=environment)
db = firestore.client(app=environment_app)
db._database_string_internal = (
    f"projects/{project_id}/databases/dts-dmo-{environment}"
)
configs_ref = db.collection('configs')
jobs_ref = db.collection('jobs')

# Permission principals
reader_principals = [cloud_run_sa]
organizer_principals = [
    cloud_run_sa,
    rclone_admin_sa
]

# Healthcheck
@app.get("/healthcheck")
def healthcheck():
    return jsonify({"status": "healthy"}), 200

@app.get('/group/validate')
def validate_group():
    """
        validate_group() : Fetches Google Group
        information using the Admin API
    """
    group_response = {}
    try:
        # Check if group email address is a valid Google Group in the organization
        if "email" in request.args:
            group_email = request.args["email"]
            group_data = admin.validate_google_group(group_email)
            group_response = group_data
        else:
            raise Exception('The "email" argument was not found in the request query string')

        group_response.update({"success": True})
        return jsonify(group_response), 200
    except Exception as e:
        return jsonify({"message": f"VALIDATE GROUP ERROR: {e}", "success": False}), 200

@app.post('/configs/add')
def add_config():
    """
        add_config() : Add either "gcs" or "drive" rclone
        config to Firestore "configs" collection.
    """
    try:
        config_request = request.json
        config_response = {}
        config_details = {}
        command_details = {}
        subfolders = []
        member_configs = []
        config_uid = ""
        shared_drive_id = None
        root_folder_id = None

        # Check if User ID is in request
        if config_request.get("uid", "") == "":
            raise Exception("No User ID (uid) in request")
        else:
            user_id = config_request.pop("uid")

        # Check if Storage Type is in request
        if config_request.get("storage_type", "") == "" or config_request.get("storage_type") not in ["gcs", "drive"]:
            raise Exception('No Storage Type (storage_type) in request. The "storage_type" argument must be set to "gcs" or "drive"')
        else:
            storage_type = config_request.pop("storage_type")

        # Set rclone config details for "drive"
        if storage_type == "drive":
            # Check if Drive Type is in request
            if config_request.get("drive_type", "") == "" or config_request.get("drive_type") not in ["shared", "mydrive", "group"]:
                raise Exception('If "storage_type" is set to "drive", the "drive_type" argument must be set to "shared", "mydrive", or "group"')
            else:
                drive_type = config_request.get("drive_type")
                command_details["drive_type"] = config_request.pop("drive_type")

            if drive_type == "shared":
                # Check if Shared Drive ID is in request
                if config_request.get("shared_drive_id", "") == "":
                    raise Exception('No Shared Drive ID in request where Drive Type (drive_type) is set to "shared"')
                else:
                    shared_drive_id = config_request.pop("shared_drive_id")

                # Grant service account Organizer role on the Shared Drive Root
                assigned_organizer_role = drive.add_role(shared_drive_id, "organizer", organizer_principals)
                if assigned_organizer_role != True:
                    raise Exception('Could not grant Service Accounts Organizer role on the Shared Drive Root')
                else:
                    logging.info(f"Shared Drive: Added Service Accounts as Organizer on Shared Drive Root")
                
                # Check if Drive URL is in request
                if config_request.get("url", "") != "":
                    drive_url = config_request.pop("url")

                    # Parse Drive Folder ID from the Drive URL
                    folder_search = re.search('^https:\\/\\/drive\\.google\\.com\\/drive\\/folders\\/(.*)$', drive_url)
                    if folder_search:
                        folder_id = folder_search.group(1)
                    else:
                        raise Exception('Could not properly parse Drive Folder ID from Drive URL (url)')

                    # Get Shared Drive Folder information from Folder ID parsed from URL
                    folder_response = drive.get_folder_info(folder_id)
                    logging.info(f"Shared Drive: Folder Response: {folder_response}")

                    # Parse the Shared Drive ID and the Folder ID (if different from the Shared Drive ID)
                    root_shared_drive_id = folder_response.get("shared_drive_id", None)
                    root_folder_id = folder_response.get("root_folder_id", None)

                    if root_shared_drive_id != shared_drive_id:
                        raise Exception('ADD CONFIG ERROR: Folder URL is not part of the provided Shared Drive')
                    
                    # Shared Drive - Subfolder: Config Details 
                    config_details = {
                        "storage_type": storage_type,
                        "team_drive": root_shared_drive_id,
                        "root_folder_id": root_folder_id,
                        "scope": "drive"
                    }
                else:
                    # Get Shared Drive Folder information from Folder ID parsed from URL
                    folder_response = drive.get_folder_info(shared_drive_id)
                    logging.info(f"Shared Drive: Full Drive Response: {folder_response}")

                    # Shared Drive - Full Drive: Config Details 
                    config_details = {
                        "storage_type": storage_type,
                        "team_drive": shared_drive_id,
                        "scope": "drive"
                    }

                # Get Subfolders of the Shared Drive Root / Subfolder
                subfolders = drive.list_subfolders("shared", shared_drive_id, None, root_folder_id, False)
                logging.info(f"Shared Drive: Subfolders: {subfolders}")

                # Create Shared Drive Config Name
                config_name = f'{folder_response.get("shared_drive_name")}'

                if root_folder_id is None:
                    config_name += f" (Full Drive)"
                else:
                    config_name += f'|{folder_response.get("root_folder_name")} (Subfolder)'
            
                # Generate unique identifier for Shared Drive
                config_uid = f'{storage_type}|{drive_type}|{shared_drive_id}'
                if (root_folder_id is not None) and (shared_drive_id != root_folder_id):
                    config_uid += f'|{root_folder_id}'

            elif drive_type == "mydrive":
                # Check if Impersonate User Email Address is in request
                if config_request.get("impersonate_user", "") == "":
                    raise Exception('If "drive_type" is set to "mydrive", the My Drive owner\'s email address must be provided in "impersonate_user"')
                else:
                    impersonate_user = config_request.get("impersonate_user")
                    impersonate_user_id = admin.validate_impersonated_user(impersonate_user)

                if impersonate_user_id == "":
                    raise Exception('The provided "impersonate_user" is not a valid member of this Workspace organization')
                else:
                    logging.info(f"My Drive: Validated Impersonated User is a member of this Organization")
                    command_details["impersonate_user"] = config_request.pop("impersonate_user")

                # If a My Drive subfolder is provided by passing the Drive URL (url) parameter
                if config_request.get("url", "") != "":
                    drive_url = config_request.pop("url")
                    # Parse My Drive Folder ID from the Drive URL
                    folder_search = re.search('^https:\\/\\/drive\\.google\\.com\\/drive\\/folders\\/(.*)$', drive_url)
                    if folder_search:
                        folder_id = folder_search.group(1)
                    else:
                        raise Exception('Could not properly parse Drive Folder ID from Drive URL (url)')

                    # Get My Drive Folder information from Folder ID parsed from URL (and impersonated user if provided)
                    folder_response = drive.get_folder_info(folder_id, impersonate_user)
                    logging.info(f"My Drive: Folder Response: {folder_response}")

                    # Parse the My Folder ID and set it as the root_folder_id
                    root_folder_id = folder_response.get("root_folder_id", None)
                    
            
                subfolders = drive.list_subfolders("mydrive", None, impersonate_user, root_folder_id, False)
                logging.info(f"My Drive: Subfolders: {subfolders}")

                # My Drive - Full Drive / Subfolder: Config Details
                config_details = {
                    "storage_type": storage_type,
                    "root_folder_id": subfolders["parent"],
                    "scope": "drive"
                }

                # Create My Drive Config Name
                config_name = f'My Drive|{impersonate_user}'

                if root_folder_id is None:
                    config_name += f" (Full Drive)"
                else:
                    config_name += f'|{folder_response.get("root_folder_name")} (Subfolder)'
                
                
            
                # Generate unique identifier for Google Drive - My Drive
                config_uid = f'{storage_type}|{drive_type}|{impersonate_user_id}'
                if root_folder_id is not None:
                    config_uid += f'|{root_folder_id}'

            elif drive_type == "group":
                # Check if Impersonate User Email Address is in request
                if config_request.get("group", "") == "":
                    raise Exception('If "drive_type" is set to "group", the Google Group ID must be provided in "group"')
                else:
                    group_id = config_request.get("group")
                    # Validate Group ID and get email address and list of members
                    group_data = admin.validate_google_group(group_id)
                    group_email = group_data.get("group_email", "")
                    group_members = group_data.get("group_members", [])
                    logging.info(f"Group Email: {group_email}")
                    logging.info(f"Group Members: {group_members}")


                for member in group_members:
                    logging.info(f"Member: {member}")
                    member_type = member.get("type")
                    member_id = member.get("id")
                    member_email = member.get("email")
                    if member_type == "USER":
                        subfolders_data = drive.list_subfolders("mydrive", None, member_email, None, False)
                        subfolders = subfolders_data.get("subfolders", [])
                        root_folder_id = subfolders_data.get("parent", "")
                        logging.info(f"Group: {member_email}: Subfolders: {subfolders}")
                        member_configs.append({"impersonate_user": member_email, "impersonate_user_id": member_id, "root_folder_id": root_folder_id, "subfolders": subfolders})
                
                logging.info(f"Member Configs: {member_configs}")

                # Group User (My Drive - Full Drive): Config Details
                config_details = {
                    "storage_type": storage_type,
                    "scope": "drive"
                }

                # Validate number of users in Google Group
                if len(member_configs) == 0:
                    raise Exception('No users in the provided Google Group')
                if len(member_configs) > int(group_user_limit):
                    raise Exception(f'Number of users in the Google Group exceeds the current limit of: {group_user_limit} users')

                # Create Group Config Name
                config_name = f'Group|{group_email} ({len(member_configs)} users)'
                logging.info(f"Config Name: {config_name}")
            
                # Generate unique identifier for Google Drive - Group
                config_uid = f'{storage_type}|{drive_type}|{group_id}'
                logging.info(f"Config UID: {config_uid}")


        # Set rclone config details for "gcs"
        elif storage_type == "gcs":
            # Check if Project Number is in request
            if "project_number" not in config_request or config_request.get("project_number") == "":
                raise Exception("ADD CONFIG ERROR: No Project Number (project_number) in request")
            else:
                project_number = config_request.get("project_number")
            # Check if GCS Bucket Name is in request
            if "bucket" not in config_request or config_request.get("bucket") == "":
                raise Exception("ADD CONFIG ERROR: No GCS Bucket (bucket) in request. This Bucket name must be globally unique.")
            else:
                bucket = config_request.pop("bucket")
                command_details["bucket"] = bucket
                prefix = config_request.get("prefix", "")

            # Clean Prefix of Leading/Trailing "/"
            if prefix != "":
                prefix = config_request.pop("prefix")
                prefix = prefix.strip("/")
                command_details["prefix"] = prefix
            
            # Create GCS Config Name
            config_name = f'{bucket}'

            if prefix != "":
                config_name += f'/{prefix}'

            # Generate unique identifier for Google Cloud Storage
            config_uid = f'{storage_type}|{project_number}|{bucket}'
            if prefix != "":
                prefix_id = prefix.replace("/", ":")
                config_uid += f'|{prefix_id}'
            
            # Google Cloud Storage: Config Details 
            config_details = {
                "project_number": config_request.get("project_number"),
                "object_acl": config_request.get("object_acl", "private"),
                "bucket_acl": config_request.get("bucket_acl", "private"),
                "location": config_request.get("location", "us"),
                "storage_class": config_request.get("storage_class", ""),
                "storage_type": "gcs"
            }

        # Update API response
        created_time = datetime.datetime.now()
        config_response.update({"storage_type": storage_type, "config_id": config_uid, "created_time": created_time})
        
        # Create/update a Config document in Firestore
        configs_ref.document(config_uid).set({
            "config_id": config_uid,
            "config_name": config_name,
            "user_id": user_id,
            "storage_type": storage_type,
            "created": created_time,
            "command": command_details,
            "config": config_details
        }, merge=True)

        # Add sub-collections for Group Member / Subfolder configs
        children_count = 0
        if storage_type == "drive":
            if drive_type == "group":
                # Check if config document exists already
                existing_member_documents = configs_ref.document(config_uid).collection("members").list_documents()
                for member_document_ref in existing_member_documents:
                    existing_child_documents = member_document_ref.collection("children").list_documents()
                    for child_document_ref in existing_child_documents:
                        logging.info(f"Deleting child document {child_document_ref.id} for member {member_document_ref.id}")
                        child_document_ref.delete()
                    logging.info(f"Deleting member document {member_document_ref.id}")
                    member_document_ref.delete()

                for member_config in member_configs:
                    member_impersonate_user = member_config["impersonate_user"]
                    member_impersonate_user_id = member_config["impersonate_user_id"]
                    member_root_folder_id = member_config["root_folder_id"]
                    member_subfolders = member_config["subfolders"]
                    member_config = {
                        "root_folder_id": member_root_folder_id,
                        "scope": "drive",
                        "storage_type": "drive",
                    }
                    member_command = {
                        "drive_type": "mydrive",
                        "impersonate_user": member_impersonate_user
                    }
                    configs_ref.document(config_uid).collection("members").document(member_impersonate_user_id).set({"storage_type": storage_type, "config": member_config, "command": member_command}, merge=True)
                    if len(member_subfolders) > 0:
                        for member_subfolder in member_subfolders:
                            subfolder_config = {
                                "scope": "drive",
                                "storage_type": "drive",
                                "root_folder_id": member_subfolder["id"]
                            }
                            subfolder_command = {
                                "drive_type": "mydrive",
                                "folder_name": member_subfolder["name"],
                                "impersonate_user": member_impersonate_user
                            }
                            subfolder_docs = (
                                configs_ref.document(config_uid).collection("members").document(member_impersonate_user_id).collection("children")
                                .where(filter=FieldFilter("config.root_folder_id", "==", member_subfolder["id"]))
                                .get()
                            )
                            if len(subfolder_docs) > 0:
                                subfolder_doc_id = subfolder_docs[0].id
                                configs_ref.document(config_uid).collection("members").document(member_impersonate_user_id).collection("children").document(subfolder_doc_id).set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                            else:
                                configs_ref.document(config_uid).collection("members").document(member_impersonate_user_id).collection("children").document().set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                            
                            children_count += 1
            elif drive_type == "shared":
                if len(subfolders["subfolders"]) > 0:
                    for subfolder in subfolders["subfolders"]:
                        subfolder_config = {
                            "team_drive": shared_drive_id,
                            "scope": "drive",
                            "storage_type": "drive",
                            "root_folder_id": subfolder["id"]
                        }
                        subfolder_command = {
                            "drive_type": "shared",
                            "folder_name": subfolder["name"]
                        }
                        subfolder_docs = (
                            configs_ref.document(config_uid).collection("children")
                            .where(filter=FieldFilter("config.root_folder_id", "==", subfolder["id"]))
                            .get()
                        )
                        if len(subfolder_docs) > 0:
                            subfolder_doc_id = subfolder_docs[0].id
                            configs_ref.document(config_uid).collection("children").document(subfolder_doc_id).set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                        else:
                            configs_ref.document(config_uid).collection("children").document().set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                            
                        children_count += 1                       
            elif drive_type == "mydrive":
                if len(subfolders["subfolders"]) > 0:
                    for subfolder in subfolders["subfolders"]:
                        subfolder_config = {
                            "scope": "drive",
                            "storage_type": "drive",
                            "root_folder_id": subfolder["id"]
                        }
                        subfolder_command = {
                            "drive_type": "mydrive",
                            "folder_name": subfolder["name"],
                            "impersonate_user": impersonate_user
                        }
                        subfolder_docs = (
                            configs_ref.document(config_uid).collection("children")
                            .where(filter=FieldFilter("config.root_folder_id", "==", subfolder["id"]))
                            .get()
                        )
                        if len(subfolder_docs) > 0:
                            subfolder_doc_id = subfolder_docs[0].id
                            configs_ref.document(config_uid).collection("children").document(subfolder_doc_id).set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                        else:
                            configs_ref.document(config_uid).collection("children").document().set({"config": subfolder_config, "command": subfolder_command}, merge=True)
                            
                        children_count += 1
                            
            config_response.update({"children_count": children_count})
        
        config_response.update({"success": True})
        return jsonify(config_response), 200
    except Exception as e:
        return jsonify({"message": f"ADD CONFIG ERROR: {e}", "success": False}), 200
         
@app.get('/configs/list')
def list_configs():
    """
        list_configs() : Fetches config documents
        from the Firestore "configs" collection
    """
    config_list = []
    try:
        # Check if configs should be filtered by uid
        if "uid" in request.args:
            # Get configs filtered to specific user (uid)
            user_id = request.args["uid"]
            configs = (
                configs_ref
                    .where(filter=FieldFilter("user_id", "==", user_id))
                    .stream()
            )
        else:
            # Get all configs
            configs = (
                configs_ref.stream()
            )
        
        for config_doc in configs:
            config_doc_ref = config_doc.reference
            config_data = config_doc.to_dict()
            children_config_refs = []
            for subcol_ref in config_doc_ref.collections():
                logging.info(f"Subcol ID: {subcol_ref.id}")
                if subcol_ref.id == "children":
                    logging.info("Found children configs!")
                    config_data["children"] = []
                    children_config_refs.extend(subcol_ref.list_documents())
            if len(children_config_refs) == 0:
                logging.info(f"No child configs for this source...")
            else:
                for child_config_doc_ref in children_config_refs:
                    child_config_doc = child_config_doc_ref.get()
                    child_config = child_config_doc.to_dict()
                    config_data["children"].append(child_config)
            
            config_list.append(config_data)

        return jsonify({"configs": config_list}), 200
    except Exception as e:
        return jsonify({"message": f"LIST CONFIGS ERROR: {e}", "success": False}), 200

@app.post('/jobs/add')
def add_job():
    """
        add_job() : Add a job to Firestore "jobs" collection.
    """
    try:
        job_request = request.json
        job_response = {}

        # Check if User ID is in request
        if job_request.get("uid", "") == "":
            raise Exception("No User ID (uid) in request")
        else:
            user_id = job_request.get("uid")
        
        # Check if Source Config ID is in request
        if job_request.get("src_config_id", "") == "":
            raise Exception("No Source Config ID (src_config_id) in request")
        else:
            src_config_doc_ref = configs_ref.document(job_request.get("src_config_id"))

        # Check if Destination Config ID is in request
        if job_request.get("dst_config_id", "") == "":
            raise Exception("No Destination Config ID (dst_config_id) in request")
        else:
            dst_config_doc_ref = configs_ref.document(job_request.get("dst_config_id"))

        # Check if Notified Users is in request
        if job_request.get("notify_users", "") != "":
            notify_users = job_request.get("notify_users")
            notify_users_clean = notify_users.replace(" ", "")
            notify_users_list = notify_users_clean.split(",")
        else:
            notify_users_list = []

        # Get User Type and Job Type (for now only "admin" user type is supported)
        user_type = job_request.get("user_type", "admin")
        job_type = job_request.get("job_type", "copy")

        # Get Source Name & Source Drive Type
        src_config_doc = src_config_doc_ref.get()
        src_config = src_config_doc.to_dict()
        src_name = src_config.get("config_name")
        src_drive_type = src_config.get("command", {}).get("drive_type")

        # Get Destination Name
        dst_config_doc = dst_config_doc_ref.get()
        dst_config = dst_config_doc.to_dict()
        dst_name = dst_config.get("config_name")


        job_details = {
            "user_id": user_id,
            "user_type": user_type,
            "job_type": job_type,
            "src_config": src_config_doc_ref,
            "src_name": src_name,
            "src_type": src_drive_type,
            "dst_config": dst_config_doc_ref,
            "dst_name": dst_name,
            "notify_users": notify_users_list
        }

        job_monitoring_defaults = {
            "job_created": datetime.datetime.now(),
            "status": "pending",
            "status_updated": datetime.datetime.now(),
            "job_started": datetime.datetime.now(),
            "job_completed": "",
            "job_duration": 0,
            "job_error": ""
        }

        try:
            _, job_doc_ref = jobs_ref.add({**job_details, **job_monitoring_defaults})
            job_id = job_doc_ref.path.split("/")[-1]
            job_response.update({"job_id": job_id})
        except Exception as e:
            logging.error("Deleting Job from Firestore collection")
            job_doc_ref.delete()
            raise Exception("Couldn't add Job to Firestore and obtain Job ID (document ID)")

        try:
            children_count = 0

            if src_drive_type == "group":
                for subcol_ref in src_config_doc_ref.collections():
                    if subcol_ref.id == "members":
                        src_member_config_refs = []
                        logging.info("Found group member config sub-collection!")
                        src_member_config_refs.extend(subcol_ref.list_documents())

                        if len(src_member_config_refs) == 0:
                            logging.info(f"No group members in this sub-collection...")
                        else:
                            for src_member_config_doc_ref in src_member_config_refs:
                                src_member_config_doc = src_member_config_doc_ref.get()
                                src_member_config_doc_id = src_member_config_doc.id
                                job_doc_ref.collection("members").document(src_member_config_doc_id).set({"src_member_config_ref": src_member_config_doc_ref, **job_monitoring_defaults})
                                for child_subcol_ref in src_member_config_doc_ref.collections():
                                    if child_subcol_ref.id == "children":
                                        src_children_config_refs = []
                                        src_children_config_refs.extend(child_subcol_ref.list_documents())
                                
                                        if len(src_children_config_refs) == 0:
                                            logging.info(f"No children in this sub-collection...")
                                        else:
                                            for src_child_config_doc_ref in src_children_config_refs:
                                                src_child_config_doc = src_child_config_doc_ref.get()
                                                src_child_config_doc_id = src_child_config_doc.id
                                                job_doc_ref.collection("members").document(src_member_config_doc_id).collection("children").document(src_child_config_doc_id).set({"src_child_config_ref": src_child_config_doc_ref, **job_monitoring_defaults})
                                            children_count += len(src_children_config_refs)

                                try:
                                    member_job_id = f"{job_id}/{src_member_config_doc_id}"
                                    logging.info(f"Member Job ID: {member_job_id}")
                                    member_job_details = {
                                        "user_id": user_id,
                                        "user_type": user_type,
                                        "job_type": job_type,
                                        "src_config": src_member_config_doc_ref,
                                        "src_name": src_name,
                                        "src_type": src_drive_type,
                                        "dst_config": dst_config_doc_ref,
                                        "dst_name": dst_name,
                                        "notify_users": notify_users_list
                                    }
                                    logging.info(f"Member Job Details: {member_job_details}")
                                    member_config_created = rclone.create_config_file(member_job_id, member_job_details)
                                    if member_config_created == False:
                                        logging.error("Job Config existed in Cloud Storage bucket already")
                                except Exception as e:
                                    logging.error("Deleting Job from Firestore collection")
                                    job_doc_ref.delete()
                                    raise Exception("Couldn't create Job Config file and store in Google Cloud Storage")
                                
                                try:
                                    member_filter_created = rclone.create_filter_file(member_job_id, member_job_details)
                                except Exception as e:
                                    logging.error("Deleting Job from Firestore collection")
                                    job_doc_ref.delete()
                                    logging.error("Couldn't create Filter file and store in Google Cloud Storage")
                                    raise Exception("Couldn't create Filter file and store in Google Cloud Storage")
                                
                            children_count += len(src_member_config_refs)
                            job_response.update({"children_count": children_count})
            elif src_drive_type in ["shared", "mydrive"]:
                for subcol_ref in src_config_doc_ref.collections():
                    if subcol_ref.id == "children":
                        logging.info("Found children sub-collection!")
                        src_children_config_refs = []
                        src_children_config_refs.extend(subcol_ref.list_documents())
                
                        if len(src_children_config_refs) == 0:
                            logging.info(f"No children in this sub-collection...")
                        else:
                            for src_child_config_doc_ref in src_children_config_refs:
                                src_child_config_doc = src_child_config_doc_ref.get()
                                src_child_config_doc_id = src_child_config_doc.id
                                job_doc_ref.collection("children").document(src_child_config_doc_id).set({"src_child_config_ref": src_child_config_doc_ref, **job_monitoring_defaults})
                            
                            job_response.update({"children_count": len(src_children_config_refs)})
                try:
                    config_created = rclone.create_config_file(job_id, job_details)
                    if config_created == False:
                        logging.error("Job Config existed in Cloud Storage bucket already")
                except Exception as e:
                    logging.error("Deleting Job from Firestore collection")
                    job_doc_ref.delete()
                    raise Exception(f"Couldn't create Job Config file and store in Google Cloud Storage: {e}")
                
                try:
                    filter_created = rclone.create_filter_file(job_id, job_details)
                except Exception as e:
                    logging.error("Deleting Job from Firestore collection")
                    job_doc_ref.delete()
                    logging.error("Couldn't create Filter file and store in Google Cloud Storage")
                    raise Exception("Couldn't create Filter file and store in Google Cloud Storage")
                
        except Exception as e:
            logging.error("Deleting Job from Firestore collection")
            job_doc_ref.delete()
            raise Exception(f"Couldn't fetch Sub-Job Config Document References: {e}")

        
        
        job_response.update({"success": True})
        return jsonify(job_response), 200
    except Exception as e:
        return jsonify({"message": f"ADD JOB ERROR: {e}", "success": False}), 200

@app.get('/jobs/list')
def list_jobs():
    """
        list_jobs() : Fetches job documents
        from the Firestore "jobs" collection
    """
    job_list = []
    try:
        # Check if jobs should be filtered by uid
        if "uid" in request.args:
            # Get jobs filtered to specific user (uid)
            user_id = request.args["uid"]
            jobs_list = (
                jobs_ref
                    .where(filter=FieldFilter("user_id", "==", user_id))
                    .stream()
            )
        else:
            # Get all jobs
            jobs_list = (
                jobs_ref.stream()
            )
        
        for job_doc in jobs_list:
            job_data = jobs.Job.doc_to_dict(job_doc)
            job_list.append(job_data)

        return jsonify({"jobs": job_list}), 200
    except Exception as e:
        return f"An Error Occured: {e}"

@app.post('/jobs/start')
def start_job():
    """
        start_job() : Submits a Cloud Workflow Execution
    """
    try:
        job_start_request = request.json
        # Check if User ID is in request
        if "uid" not in job_start_request or job_start_request.get("uid") == "":
            raise Exception("No User ID (uid) in request")
        else:
            user_id = job_start_request.get("uid")
        
        # Check if Job ID is in request
        if "job_id" not in job_start_request or job_start_request.get("job_id") == "":
            raise Exception("No Job ID (job_id) in request")
        else:
            job_id = job_start_request.get("job_id")
        
        try:
            job_doc_ref = jobs_ref.document(job_id)
            job_doc = job_doc_ref.get()
            job = job_doc.to_dict()
            logging.info(f"Job Config: {job}")
        except Exception as e:
            raise Exception("Could not fetch Job config from Firestore")
        
        try:
            src_type = job.get("src_type", "")
            if src_type == "":
                raise Exception("Could not get the job's source type")
        except Exception as e:
            raise Exception(f"Could not get the job's source type: {e}") 

        try:
            has_children = False
            for subcol_ref in job_doc_ref.collections():
                logging.info(f"Sub-Collection ID: {subcol_ref.id}")
                if subcol_ref.id == "members" or subcol_ref.id == "children":
                    child_config_refs = []
                    child_config_refs.extend(subcol_ref.list_documents())
                    if len(child_config_refs) > 0:
                        has_children = True
        except Exception as e:
            raise Exception(f"Could not fetch Child Job configs from Firestore: {e}")
        
        try:
            execution_response = workflow.submit_cloud_workflow(user_id, environment, src_type, job_id, job, has_children)
            execution_parts = execution_response.split("/")
            workflow_location = execution_parts[3]
            workflow_name = execution_parts[5]
            workflow_execution = execution_parts[7]
            workflow_url = f"https://console.cloud.google.com/workflows/workflow/{workflow_location}/{workflow_name}/execution/{workflow_execution}/summary?project={project_id}"
            job_doc_ref.update({"workflow_url": workflow_url})
            return jsonify({"job_id": job_id, "workflow_url": workflow_url, "success": True}), 200
        except Exception as e:
            raise Exception("Unable to submit Cloud Workflow Execution")

    except Exception as e:
        return jsonify({"message": f"START JOB ERROR: {e}", "success": False}), 200

@app.get('/drive/list')
def list_shared_drives():
    """
        list_shared_drives() : Fetches all Shared Drives
        in the organization
    """
    try:
        drives_response = drive.list_shared_drives()
        logging.info(f"Shared Drive Response: {drives_response}")
        drives_response.update({"success": True})
        return jsonify(drives_response), 200
    except Exception as e:
        return jsonify({"message": f"DRIVES LIST ERROR: {e}", "success": False}), 200


@app.post('/drive/info')
def get_drive_info():
    """
        get_drive_info() : Fetches Google Drive info given
        a url
    """
    try:
        config_request = request.json
        info_response = {}

        # Check if Drive URL is in request
        if config_request.get("url", "") == "":
            raise Exception("ADD CONFIG ERROR: No Drive URL (url) in request")
        else:
            drive_url = config_request.get("url")

        folder_search = re.search('^https:\\/\\/drive\\.google\\.com\\/drive\\/folders\\/(.*)$', drive_url)
        if folder_search:
            folder_id = folder_search.group(1)
        else:
            raise Exception('ADD CONFIG ERROR: Could not properly parse Drive Folder ID from Drive URL (url)')
        
        folder_response = drive.get_folder_info(folder_id)

        if folder_response["mimeType"] != "application/vnd.google-apps.folder":
            raise Exception('ADD CONFIG ERROR: The "url" field must contain a URL to a Drive or Folder')
            
        if folder_response.get("driveId", "") == "":
            info_response["shared"] = False
            return jsonify(info_response), 200
        else:
            shared_drive_id = folder_response.get("driveId")
            info_response["shared"] = True
            info_response["shared_drive_id"] = shared_drive_id

            if folder_response.get("id") != shared_drive_id:
                root_folder_id = folder_response.get("id")
                info_response["root_folder_id"] = root_folder_id

            return jsonify(info_response), 200
        
    except Exception as e:
        return f"An Error Occured: {e}"

@app.post('/drive/subfolders')
def get_drive_subfolders():
    """
        get_drive_subfolders() : Fetches Shared Google Drives subfolders
        given a Drive URL (url)
    """
    try:
        config_request = request.json
        shared_drive_id = None
        root_folder_id = None

        # Check if Drive Type is in request
        if config_request.get("drive_type", "") == "":
            raise Exception("No Drive Type (drive_type) in request")
        else:
            drive_type = config_request.get("drive_type")

        # Check if Recursive Flag is in request
        recursive = config_request.get("recursive", True)

        # If Drive Type is "shared", check if Drive URL is in request
        if drive_type == "shared" and config_request.get("url", "") == "":
            raise Exception('When Drive Type (drive_type) is set to "shared", a Drive URL (url) must also be included in the request')
        else:
            drive_url = config_request.get("url", None)

        # If Drive Type is "mydrive", check if Impersonate User is in request
        if drive_type == "mydrive" and config_request.get("impersonate_user", "") == "":
            raise Exception('When Drive Type (drive_type) is set to "mydrive", an Impersonated User (impersonate_user) must also be included in the request')
        else:
            impersonate_user = config_request.get("impersonate_user", None)
        
        # Parse Drive Folder ID from the Drive URL
        if drive_url is not None:
            folder_search = re.search('^https:\\/\\/drive\\.google\\.com\\/drive\\/folders\\/(.*)$', drive_url)
            if folder_search:
                folder_id = folder_search.group(1)
            else:
                raise Exception('Could not properly parse Drive Folder ID from Drive URL (url)')

            # Get Drive Folder information from Folder ID parsed from URL (and impersonated user if provided)
            folder_response = drive.get_folder_info(folder_id, impersonate_user)
            logging.info(f"Folder Response: {folder_response}")

            # Ensure that the response from the Drive API indicates the resource is a Drive Folder
            if folder_response["mimeType"] != "application/vnd.google-apps.folder":
                raise Exception('The "url" field must contain a URL to a Drive or Folder')
        
            # Parse the Shared Drive ID if the response is a Shared Drive or subfolder of Shared Drive
            shared_drive_id = folder_response.get("driveId")
            root_folder_id = folder_response.get("id")

        subfolders = drive.list_subfolders(drive_type, shared_drive_id, impersonate_user, root_folder_id, recursive)

        return jsonify({"parent_folder": subfolders["parent"], "subfolders": subfolders["subfolders"], "success": True}), 200
    except Exception as e:
        return f"LIST SUBFOLDERS ERROR: {e}"

@app.post('/workflow/notify')
def send_workflow_notifications():
    try:
        config_request = request.json

        if config_request.get("job_id", "") == "":
            raise Exception('No "job_id" was provided in the request body')
        else:
            job_id = config_request.get("job_id")

        if config_request.get("status", "") == "":
            raise Exception('No "status" was provided in the request body')
        else:
            status = config_request.get("status")
        
        if config_request.get("url", "") == "":
            raise Exception('A workflow URL ("url") was not provided in the request body')
        else:
            workflow_url = config_request.get("url", "")

        notify_users = config_request.get("notify_users", [])

        job_doc_ref = jobs_ref.document(job_id)
        job_doc = job_doc_ref.get()
        job = job_doc.to_dict()

        messages_sent = notification.send_gmail_notification(job_id, job, status, notify_users, workflow_url)
        return jsonify({"messages": messages_sent, "success": True}), 200
    except Exception as e:
        return jsonify({"message": f"SEND NOTIFICATION ERROR: {e}", "success": False}), 200
    
if __name__ == "__main__":
    logging.info(" Starting app...")
    app.run(host="0.0.0.0", port=8080)