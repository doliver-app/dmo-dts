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
from datetime import datetime
import logging
# Google Cloud Imports
from google.cloud.firestore_v1.base_document import DocumentSnapshot

class Job:
    def __init__(self, user_id, user_type, job_type, src_config, src_name, src_type, dst_config, dst_name, notify_users):
        self.user_id = user_id
        self.user_type = user_type
        self.job_type = job_type
        self.src_config = src_config
        self.src_name = src_name
        self.src_type = src_type
        self.dst_config = dst_config
        self.dst_name = dst_name
        self.notify_users = notify_users

    @staticmethod
    def from_dict(source):
        return Job(
            user_id = source.get("user_id"),
            user_type = source.get("user_type"),
            job_type = source.get("job_type"),
            src_config=source.get("src_config"),
            src_name=source.get("src_name"),
            src_type=source.get("src_type"),
            dst_config = source.get("dst_config"),
            dst_name=source.get("dst_name"),
            notify_users = source.get("notify_users")
        )

    @staticmethod
    def doc_to_dict(doc: DocumentSnapshot):
        # Source Config -> Dict
        src_config_doc_ref = doc.get("src_config")
        src_config_doc = src_config_doc_ref.get()
        src_config = src_config_doc.to_dict()
        src_config_children_refs = []
        for subcol_ref in src_config_doc_ref.collections():
            if subcol_ref.id == "children":
                src_config_children_refs.extend(subcol_ref.list_documents())
        if len(src_config_children_refs) >= 0:
            children = []
            for src_config_child_doc_ref in src_config_children_refs:
                src_config_child_doc = src_config_child_doc_ref.get()
                src_config_child = src_config_child_doc.to_dict()
                children.append(src_config_child)    
            src_config["children"] = children
        # Destination Config -> Dict
        dst_config_doc_ref = doc.get("dst_config")
        dst_config_doc = dst_config_doc_ref.get()
        dst_config = dst_config_doc.to_dict()
        return {
            "user_id": doc.get("user_id"),
            "user_type": doc.get("user_type"),
            "job_type": doc.get("job_type"),
            "src_config": src_config,
            "src_name": doc.get("src_name"),
            "src_type": doc.get("config", {}).get("drive_type", ""),
            "dst_config": dst_config,
            "dst_name": doc.get("dst_name"),
            "notify_users": doc.get("notify_users")
        }

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "user_type": self.user_type,
            "job_type": self.job_type,
            "src_config": self.src_config,
            "src_name": self.src_name,
            "src_type": self.src_type,
            "dst_config": self.dst_config,
            "dst_name": self.dst_name,
            "notify_users": self.notify_users
        }

    def __repr__(self):
        return f"Job(\
            user_id={self.user_id}, \
            user_type={self.user_type}, \
            job_type={self.job_type}, \
            src_config={self.src_config}, \
            src_name={self.src_name}, \
            src_type={self.src_type}, \
            dst_config={self.dst_config} \
            dst_name={self.dst_name}, \
            notify_users={self.notify_users} \
        )"