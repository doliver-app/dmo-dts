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
import datetime
# Google Imports
import google.auth
from google.auth import iam
from google.auth.transport import requests
from google.oauth2 import service_account
from googleapiclient.errors import HttpError
from apiclient.discovery import build

# Scopes that will allow access to Google Drive 
SCOPES = [
  "https://www.googleapis.com/auth/drive"
]
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

def get_subfolder_specs(drive_type, drive_id, subfolder_id, delegated_subject, recursive):
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, delegated_subject, SCOPES)
  files = []
  subfolder_count = 0
  file_count = 0
  size = 0
  quota_size = 0

  try:
    service = build("drive", "v3", credentials=admin_credentials)
    if drive_type == "shared":
      if drive_id is None:
        raise Exception('Subfolder Specs: Shared Drive ID must be provided if Drive Type is set to "shared"')

      logging.info(f"Listing all files in Shared Drive ({drive_id}) subfolder {subfolder_id}")
      page_token = None
      while True:
        response = (
          service.files()
            .list(
              q=f"'{subfolder_id}' in parents and trashed = false",
              fields="files(id,name,kind,driveId,mimeType,size,quotaBytesUsed,parents)",
              spaces="drive",
              corpora="drive",
              driveId=drive_id,
              supportsAllDrives=True,
              includeItemsFromAllDrives=True,
              pageToken=page_token,
            )
        ).execute()
        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken", None)
        if page_token is None:
          break
    elif drive_type == "mydrive":
      logging.info(f"Listing all files in My Drive ({delegated_subject}) subfolder {subfolder_id}")
      page_token = None
      while True:
        response = (
          service.files()
            .list(
              q=f"'{subfolder_id}' in parents and trashed = false",
              fields="files(id,name,kind,driveId,mimeType,size,quotaBytesUsed,parents)",
              spaces="drive",
              corpora="user",
              supportsAllDrives=False,
              includeItemsFromAllDrives=False,
              pageToken=page_token,
            )
        ).execute()
        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken", None)
        if page_token is None:
          break
  except HttpError as e:
    logging.error(f"An error occurred: {e}")

  logging.info(f"Subfolder File List: {files}")

  for file in files:
    if file.get("mimeType") == "application/vnd.google-apps.folder": 
      subfolder_count += 1 # Add one to account for the current subfolder
      if recursive == True:
        subfolder_specs = get_subfolder_specs(drive_type, drive_id, file.get("id"), delegated_subject, True)
        # Add the counts of child files/folders
        subfolder_count += subfolder_specs["subfolder_count"]
        file_count += subfolder_specs["file_count"]
        size += subfolder_specs["size"]
        quota_size += subfolder_specs["quota_size"]
    else:
      file_count += 1
      size += int(file.get("size", 0))
      quota_size += int(file.get("quotaBytesUsed", 0))

  folder_spec = {"subfolder_count": subfolder_count, "file_count": file_count, "item_count": subfolder_count + file_count, "size": size, "quota_size": quota_size}
  logging.info(f"Folder Spec: {folder_spec}")
  return folder_spec

def list_subfolders(drive_type, drive_id, delegated_subject, root_folder_id, recursive):
  """Lists subfolders in a Shared Drive or a My Drive
  If My Drive, then impersonate the Delegated Subject.
  If a Root Folder ID is provided, list the subfolders under that folder.
  """

  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, delegated_subject, SCOPES)

  files = []
  subfolder_response = {"parent": "", "subfolders": []}

  try:
    service = build("drive", "v3", credentials=admin_credentials)

    if drive_type == "shared":
      logging.info("Listing all subfolders in Shared Drive")
      if drive_id is None:
        raise Exception('List Subfolders: Shared Drive ID must be provided if Drive Type is set to "shared"')
      page_token = None
      while True:
        response = (
          service.files()
            .list(
              q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
              fields="files(id,name,kind,driveId,mimeType,size,parents)",
              spaces="drive",
              corpora="drive",
              driveId=drive_id,
              supportsAllDrives=True,
              includeItemsFromAllDrives=True,
              pageToken=page_token,
            )
        ).execute()
        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken", None)
        if page_token is None:
          break
    elif drive_type == "mydrive":
      logging.info("Listing all subfolders in MyDrive")
      page_token = None
      while True:
        response = (
          service.files()
            .list(
              q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
              fields="files(id,name,kind,driveId,mimeType,size,parents)",
              spaces="drive",
              corpora="user",
              supportsAllDrives=False,
              includeItemsFromAllDrives=False,
              pageToken=page_token,
            )
        ).execute()
        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken", None)
        if page_token is None:
          break
      logging.info(f"My Drive Files: {files}")
  
  except HttpError as e:
    logging.error(f"An error occurred: {e}")

  # Handle case where there are NO subfolders
  if len(files) == 0:
    logging.info(f"No files in {delegated_subject} MyDrive")
    return subfolder_response

  # Handle case when root_folder_id is not provided
  if root_folder_id is None:
    if drive_type == "shared":
      subfolder_response["parent"] = drive_id
      for folder in files:
        for parent_folder_id in folder.get("parents", []):
          if parent_folder_id == drive_id:
            # Get subfolder specs for a Shared Drive root
            logging.info(f'Getting specs for Shared Drive root ({drive_id}) subfolder ({folder.get("id")})')
            subfolder_specs = get_subfolder_specs(drive_type, drive_id, folder.get("id"), None, recursive)
            logging.info(f"Subfolder Specs: {subfolder_specs}")
            subfolder_object = {"id": folder.get("id"), "name": folder.get("name"), "url": f'https://drive.google.com/drive/folders/{folder.get("id")}'}
            subfolder_object.update(subfolder_specs)
            logging.info(f"Subfolder Object: {subfolder_object}")
            subfolder_response["subfolders"].append(subfolder_object)
    elif drive_type == "mydrive":
      for folder in files:
        for parent_folder_id in folder.get("parents", []):
          is_parent_a_child_folder = False
          for check_folder in files:
            if parent_folder_id == check_folder.get("id"):
              is_parent_a_child_folder = True
              break
          if is_parent_a_child_folder == False:
            subfolder_response["parent"] = parent_folder_id
            logging.info(f'Getting specs for My Drive root ({parent_folder_id}) subfolder ({folder.get("id")})...')
            subfolder_specs = get_subfolder_specs(drive_type, None, folder.get("id"), delegated_subject, recursive)
            logging.info(f"Subfolder Specs: {subfolder_specs}")
            subfolder_object = {"id": folder.get("id"), "name": folder.get("name"), "url": f'https://drive.google.com/drive/folders/{folder.get("id")}'}
            subfolder_object.update(subfolder_specs)
            logging.info(f"Subfolder Object: {subfolder_object}")
            subfolder_response["subfolders"].append(subfolder_object)
  # Handle case when root_folder_id has a value
  else:
    subfolder_response["parent"] = root_folder_id
    for folder in files:
      for parent_folder_id in folder.get("parents", []):
        if parent_folder_id == root_folder_id:
          # Get subfolder specs for a Shared Drive/My Drive subfolder (parent is "root_folder_id")
          logging.info(f"Getting specs for Drive subfolder ({root_folder_id})...")
          subfolder_specs = get_subfolder_specs(drive_type, drive_id, folder.get("id"), delegated_subject, recursive)
          logging.info(f"Subfolder Specs: {subfolder_specs}")
          subfolder_object = {"id": folder.get("id"), "name": folder.get("name"), "url": f'https://drive.google.com/drive/folders/{folder.get("id")}'}
          subfolder_object.update(subfolder_specs)
          logging.info(f"Subfolder Object: {subfolder_object}")
          subfolder_response["subfolders"].append(subfolder_object)

  return subfolder_response

def get_shared_drive_id(folder_id):
  """Gets the Shared Drive ID for a folder_id
  """
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, None, SCOPES)

  try:
    service = build("drive", "v3", credentials=admin_credentials)

    # Call the Drive v3 API to get the folder information
    results = (service.files()
      .get(
        fileId=folder_id,
        upportsAllDrives=True,
        supportsTeamDrives=True
      )
    ).execute()
    return results
  except Exception as e:
    logging.error(f"An error occurred: {e}")

def add_role(folder_id, role, principals):
  """Assigns role (role) on a Shared Drive Root or Subfolder (folder_id) for
    a given list of principals (principals)
  """
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, None, SCOPES)

  # Calculate Shared Drive permission expiration times
  service = build("drive", "v3", credentials=admin_credentials)

  try:
    for principal in principals:
      permission_template = {
        "type": "user",
        "role": role,
        "emailAddress": principal
      }
  
      # Call the Drive v3 API to grant role permission on the provided Shared Drive Root / Subfolder ID
      service.permissions().create(
        fileId=folder_id,
        body=permission_template,
        supportsAllDrives=True,
        useDomainAdminAccess=True
      ).execute()

    return True
  except Exception as e:
    raise Exception(f"Failed to assign {role} on the folder {folder_id}: {e}")

def get_folder_info(folder_id, impersonate_user=None):
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, impersonate_user, SCOPES)

  service = build("drive", "v3", credentials=admin_credentials)

  folder_response = (
    service.files()
      .get(
        fileId=folder_id,
        supportsAllDrives=True,
        supportsTeamDrives=True
      )
  ).execute()

  folder_info_response = {}

  # Ensure that the response from the Drive API indicates the resource is a Drive Folder
  if folder_response.get("mimeType") != "application/vnd.google-apps.folder":
      raise Exception('The URL provided must be for a Shared Drive or Shared/My Drive Sub-Folder')

  if folder_response.get("driveId", "") != "":
    shared_drive_id = folder_response.get("driveId", "")
    folder_info_response["shared_drive_id"] = shared_drive_id

    shared_drive_response = (
      service.drives()
        .get(
          driveId=shared_drive_id,
          useDomainAdminAccess=True
        )
    ).execute()
    
    shared_drive_name = shared_drive_response.get("name")
    folder_info_response["shared_drive_name"] = shared_drive_name
    
    if folder_response.get("id", "") != "" and folder_response.get("id", "") != shared_drive_id:
      root_folder_id = folder_response.get("id")
      root_folder_name = folder_response.get("name")
      folder_info_response["root_folder_id"] = root_folder_id
      folder_info_response["root_folder_name"] = root_folder_name
  else:
    root_folder_id = folder_response.get("id", "")
    root_folder_name = folder_response.get("name")
    folder_info_response["root_folder_id"] = root_folder_id
    folder_info_response["root_folder_name"] = root_folder_name

  return folder_info_response
  
def list_shared_drives():
  """Gets list of Shared Drives in the organization
  """
  # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
  credentials, _ = google.auth.default()
  admin_credentials = delegated_credential(credentials, "drive-transfer-service@derekmoliver.altostrat.com", SCOPES)
  drives = []
  try:
    service = build("drive", "v3", credentials=admin_credentials)

    # Call the Drive v3 API to list the Shared Drives
    page_token = None
    while True:
      response = (
        service.teamdrives()
          .list(
            pageToken=page_token,
            useDomainAdminAccess=True
          )
      ).execute()
      drives.extend(response.get("teamDrives", []))
      page_token = response.get("nextPageToken", None)
      if page_token is None:
        break

    logging.info(f"Shared Drive List: {drives}")
    drives_response = {"shared_drives": drives}
    return drives_response
  except Exception as e:
    logging.error(f"An error occurred: {e}")