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
import base64
# Email Imports
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# Google Imports
import google.auth
from google.auth import iam
from google.auth.transport import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes that will allow access to Google Drive 
SCOPES = [
  "https://mail.google.com/"
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

def send_gmail_notification(job_id,  job, status, notify_users, workflow_url):
    """Create and send an email message
    Print the returned  message id
    Returns: Message object, including message id

    Load pre-authorized user credentials from the environment.
    """
    
    # Use Application Default Credentials to obtain the Cloud Run Service Identity credentials
    credentials, _ = google.auth.default()
    admin_credentials = delegated_credential(credentials, "drive-transfer-service@derekmoliver.altostrat.com", SCOPES)
    
    try:
        src_name = job.get("src_name")
        dst_name = job.get("dst_name")
        job_start = job.get("job_started")
        job_duration = job.get("job_duration")
    except Exception as e:
        logging.error("SEND NOTIFICATION ERROR: Could not fetch Job config from Firestore")
        raise Exception(e)

    try:
        service = build("gmail", "v1", credentials=admin_credentials)
        sent_messages = []
        
        for user in notify_users:
            message = MIMEMultipart("alternative")
            message["To"] = user
            message["From"] = "drive-transfer-service@derekmoliver.altostrat.com"
            message["Subject"] = f"[{status}] Rclone Job ID: {job_id}"

            text = f"""
                Drive Transfer Service Job with ID *{job_id}* finished with a
                status of *{status}*.

                *Job Specs:*
                *Source*: {src_name}
                *Destination*: gs://{dst_name}
                *Job Start Time*: {job_start}
                *Job Duration*: {job_duration}s
                *Workflow URL*: {workflow_url}
                """
            html = f"""\
                <html>
                <body>
                    <p>Drive Transfer Service Job with ID <b>{job_id}</b> finished with a
                    status of <b>{status}</b>.</p>

                    <p>
                        <b>Job Specs:</b><br>
                        <b>Source:</b> {src_name}<br>
                        <b>Destination:</b> gs://{dst_name}<br>
                        <b>Job Start Time:</b> {job_start}<br>
                        <b>Job Duration:</b> {job_duration}s<br>
                        <b>Workflow URL:</b> <a href="{workflow_url}">Link</a><br>
                    </p>
                </body>
                </html>
                """
            text_part = MIMEText(text, "plain")
            html_part = MIMEText(html, "html")

            message.attach(text_part)
            message.attach(html_part)

            # encoded message
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

            create_message = {"raw": encoded_message}

            send_message = (
                service.users()
                .messages()
                .send(userId="drive-transfer-service@derekmoliver.altostrat.com", body=create_message)
                .execute()
            )
            logging.info(f"Send Message Response: {send_message}")
            if send_message is not None:
                sent_messages.append({"user": user, "message_id": send_message["id"]})
            else:
                logging.error(f"Gmail Send Message API returned None for user {user}...")
    except Exception as e:
        raise Exception(e)

    return sent_messages