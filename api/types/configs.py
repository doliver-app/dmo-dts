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

# Google Cloud Imports
from google.cloud.firestore_v1.base_document import DocumentSnapshot

class DriveConfig:
    def __init__(self, scope="drive", root_folder_id="", team_drive="", storage_type="drive"):
        self.scope = scope
        self.root_folder_id = root_folder_id
        self.team_drive = team_drive
        self.storage_type = storage_type

    @staticmethod
    def from_dict(source):
        return DriveConfig(
            scope = source.get("scope", "drive"),
            root_folder_id=source.get("root_folder_id", ""),
            team_drive = source.get("team_drive", ""),
            storage_type = "drive"
        )

    def to_dict(self):
        return {
            "scope": self.scope,
            "root_folder_id": self.root_folder_id,
            "team_drive": self.team_drive,
            "storage_type": "drive",
        }

    def __repr__(self):
        return f"DriveConfig( \
            scope={self.scope}, \
            root_folder_id={self.root_folder_id}, \
            team_drive={self.team_drive}, \
            storage_type={self.storage_type} \
        )"

class GcsConfig:
    def __init__(self, project_number, object_acl="private", bucket_acl="private", location="us", storage_class="", storage_type="gcs"):
        self.project_number = project_number
        self. object_acl = object_acl
        self.bucket_acl = bucket_acl
        self.location = location
        self.storage_class = storage_class
        self.storage_type = storage_type

    @staticmethod
    def from_dict(source):
        return GcsConfig(
            project_number = source.get("project_number"),
            object_acl = source.get("object_acl", "private"),
            bucket_acl = source.get("bucket_acl", "private"),
            location=source.get("location", "us"),
            storage_class = source.get("storage_class", ""),
            storage_type = "gcs"
        )

    def to_dict(self):
        return {
            "project_number": self.project_number,
            "object_acl": self.object_acl,
            "bucket_acl": self.bucket_acl,
            "location": self.location,
            "storage_class": self.storage_class,
            "storage_type": "gcs"
        }

    def __repr__(self):
        return f"GcsConfig(\
            project_number={self.project_number}, \
            object_acl={self.object_acl}, \
            bucket_acl={self.bucket_acl}, \
            location={self.location}, \
            storage_class={self.storage_class}, \
            storage_type={self.storage_type} \
        )"