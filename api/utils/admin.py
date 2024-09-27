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
import logging
# Google Imports
import google.auth
from google.auth import iam
from google.auth.transport import requests
from google.oauth2 import service_account
from googleapiclient.errors import HttpError
from apiclient.discovery import build


TOKEN_URI = 'https://accounts.google.com/o/oauth2/token'

def delegated_credential(credentials, subject, scopes):
    try:
        admin_creds = credentials.with_subject(subject).with_scopes(scopes)
    except AttributeError:  # Looks like a compute creds object
        # Refresh the boostrap credentials. This ensures that the information
        # about this account, notably the email, is populated.
        request = requests.Request()
        credentials.refresh(request)
        # Create an IAM signer using the bootstrap credentials.
        signer = iam.Signer(request, credentials, credentials.service_account_email)
        # Create OAuth 2.0 Service Account credentials using the IAM-based
        # signer and the bootstrap_credential's service account email.
        admin_creds = service_account.Credentials(
            signer,
            credentials.service_account_email,
            TOKEN_URI,
            scopes=scopes,
            subject=subject
        )
    except Exception:
        raise
    return admin_creds

def validate_impersonated_user(email):
  """Validates whether the user specified is an active member of the organization
  """
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, None, ["https://www.googleapis.com/auth/admin.directory.user.readonly"])
  try:
    service = build("admin", "directory_v1", credentials=admin_credentials)

    # Call the Admin API to get the user information
    results = service.users().get(
                userKey=email,
                projection="basic"
    ).execute()
    logging.info(f"Validate User Results: {results}")
    impersonated_user_id = results.get("id", "")
    if impersonated_user_id == "":
      return None
    else:
      return impersonated_user_id
  except Exception as e:
    logging.error(f"An error occurred: {e}")

def validate_google_group(group_email):
  """Validates the Google Group ID and returns the list of members
  """
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, None, ["https://www.googleapis.com/auth/admin.directory.group"])
  try:
    service = build("admin", "directory_v1", credentials=admin_credentials)
    
    # Call the Admin API to get the group email address
    group_results = (
      service.groups()
        .get(
          groupKey=group_email
        )
    ).execute()
    logging.info(f"Get Group Results: {group_results}")
    group_id = group_results.get("id", "")

    if group_id == "":
      logging.error("Group email could not be found for the given group ID")
      return {"error": "GROUP_NOT_VALID"}
    
    # Call the Admin API to get the list of users in the group
    members_results = (
      service.members()
        .list(
          groupKey=group_email
        )
    ).execute()
    logging.info(f"Get Members Results: {members_results}")
    group_members = members_results.get("members", [])
    
    if len(group_members) == 0:
      logging.error("Group does not contain any members")
      return {"error": "GROUP_NO_MEMBERS"}
    
    return {
      "group_id": group_id,
      "group_email": group_email,
      "group_members": group_members
    }
  except Exception as e:
    logging.error(f"An error occurred: {e}")