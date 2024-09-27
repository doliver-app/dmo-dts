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
import logging
# Google Cloud Imports
from google.cloud import storage

config_bucket_name = os.environ.get("RCLONE_CONFIG_BUCKET")
storage_client = storage.Client()

def create_config_file(job_id, job_config):
    oauth_client_id = os.environ.get("OAUTH_CLIENT_ID")
    oauth_client_secret = os.environ.get("OAUTH_CLIENT_SECRET")

    config_bucket = storage_client.bucket(config_bucket_name)

    src_config = job_config.get("src_config")
    dst_config = job_config.get("dst_config")
    
    src = src_config.get()
    dst = dst_config.get()

    # Validate Source/Destination configs are found in "config" Firestore collection
    if (src.exists == False) or (dst.exists == False):
        raise Exception("Failed to fetch Source/Destination config: Either the source/destination config ID is invalid or the config does not exist")
    
    # Delete local rclone.conf file if it exists
    try:
        if os.path.exists("./rclone.conf"):
            os.remove("./rclone.conf")
    except:
        raise Exception(f"Error while trying to delete local rclone.conf: {e}")
    
    # Validate Source/Destination configs are able to be converted to Python dictionaries
    try:
        src_config_dict = src.to_dict()
        dst_config_dict = dst.to_dict()
    except Exception as e:
        raise Exception(f"Failed to convert Source/Destination config to dict: {e}")

    try:
        src_config_lines = []
        dst_config_lines = []
        src_storage_type = src_config_dict["storage_type"]
        dst_storage_type = dst_config_dict["storage_type"]

        # Add first line of each config  as "[<storage_type>]"
        src_config_lines.append(f"[{src_storage_type}]")
        dst_config_lines.append(f"[{dst_storage_type}]")

        # Add the config type to each config as "type = <storage_type>"
        src_config_lines.append(f"type = {src_storage_type}")
        dst_config_lines.append(f"type = {dst_storage_type}")

        # Add the oauth client ID and secret to each config
        src_config_lines.append(f"client_id = {oauth_client_id}")
        src_config_lines.append(f"client_secret = {oauth_client_secret}")
        src_config_lines.append(f"service_account_file = /var/secrets/sa-rclone-{job_config.get("user_type")}-transfers-key.json")
        dst_config_lines.append(f"client_id = {oauth_client_id}")
        dst_config_lines.append(f"client_secret = {oauth_client_secret}")
        dst_config_lines.append(f"service_account_file = /var/secrets/sa-rclone-{job_config.get("user_type")}-transfers-key.json")

        # Add storage type specific config to each config
        for key, value in src_config_dict["config"].items():
            if value is None:
                value = ""
            src_config_lines.append(f"{key} = {value}")
        for key, value in dst_config_dict["config"].items():
            if value is None:
                value = ""
            dst_config_lines.append(f"{key} = {value}")
    except Exception as e:
        raise Exception(f"Failed to convert Source/Destination config from Firestore to lines that can be written to a file: {e}")
    
    # Write configs to a local file
    try:
        with open("./rclone.conf", "a+") as f:
            for line in src_config_lines:
                f.write(f"{line}\n")
            f.write("\n")
            for line in dst_config_lines:
                f.write(f"{line}\n")
    except Exception as e:
        raise Exception(f"Failed to write config to local rclone.conf file: {e}")


    try:
        job_config_path = f"{job_id}/rclone.conf"
        job_config_blob = config_bucket.blob(job_config_path)
        job_config_blob.upload_from_filename("./rclone.conf")
    except Exception as e:
        raise Exception(f"Failed to upload config to Google Cloud Storage: {e}")

    return True

def create_filter_file(job_id, job_config):
    config_bucket = storage_client.bucket(config_bucket_name)

    src_config = job_config.get("src_config")
    
    # Validate Source config is found in "config" Firestore collection
    src = src_config.get()
    if (src.exists == False):
        logging.error("Failed to fetch Source config: Either the source config ID is invalid or the config does not exist")
    
    # Delete local subfolders.txt file if it exists
    try:
        if os.path.exists("./subfolders.txt"):
            os.remove("./subfolders.txt")
    except:
        logging.error(f"Error while trying to delete local subfolders.txt: {e}")
    
    # Create list of subfolder filters (i.e. dir1/**, dir2/**, ...)
    try:
        subfolder_filters = []
        for subcol_ref in src_config.collections():
            if subcol_ref.id == "children":
                for subfolder_doc_ref in subcol_ref.list_documents():
                    subfolder_doc = subfolder_doc_ref.get()
                    subfolder = subfolder_doc.to_dict()
                    subfolder_name = subfolder.get("command", {}).get("folder_name", "")
                    subfolder_filter = f"{subfolder_name}/**"
                    subfolder_filters.append(subfolder_filter)
    except Exception as e:
        logging.error(f"Failed to create a list of subfolder filters: {e}")
    
    # If no subfolders, exit function and do not write to subfolders.txt
    if len(subfolder_filters) == 0:
        logging.info("No children found so not creating subfolders.txt file.")
        return False
    
    # Write subfolder filters to a local file subfolders.txt
    try:
        with open("./subfolders.txt", "a+") as f:
            for line in subfolder_filters:
                f.write(f"{line}\n")
    except Exception as e:
        logging.error(f"Failed to write subfolder filters to local subfolders.txt file: {e}")

    # Upload subfolder filter file to GCS config bucket
    try:
        subfolder_filter_path = f"{job_id}/subfolders.txt"
        subfolder_filter_blob = config_bucket.blob(subfolder_filter_path)
        subfolder_filter_blob.upload_from_filename("./subfolders.txt")
    except Exception as e:
        logging.error(f"Failed to upload subfolder filter file to Google Cloud Storage: {e}")

    return True