// * Copyright 2024 Google LLC
// *
// * Licensed under the Apache License, Version 2.0 (the "License");
// * you may not use this file except in compliance with the License.
// * You may obtain a copy of the License at
// *
// *      http://www.apache.org/licenses/LICENSE-2.0
// *
// * Unless required by applicable law or agreed to in writing, software
// * distributed under the License is distributed on an "AS IS" BASIS,
// * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// * See the License for the specific language governing permissions and
// * limitations under the License.

const { fetchIdToken } = require('../utils/authUtil');
const config = require('config');

const apiUrl = config.get('app.api');


// Centralized API Request Function
async function makeApiRequest(endpoint, params, method, req, data) {
    try {
      const idToken = await fetchIdToken();
      var url = `${apiUrl}${endpoint}`;
      if (params != null) {
        url += `?${params}`;
      }
      var request = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        }
      }
      if (method == "POST") {
        request.body = JSON.stringify({
          uid: req.session.email, 
          ...data, 
        })
      }
      const response = await fetch(url, request);
  
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(`${endpoint} request failed: ${result.message}`); 
      }
  
      return result;
    } catch (error) {
      console.error(`Error during ${endpoint} request:`, error);
      throw error; // Important to re-throw to handle errors properly
    }
}

async function validateGroup(req, groupEmail) {
  return makeApiRequest('/group/validate', `email=${groupEmail}`, 'GET', req, null);
}

async function getSharedDrives(req) {
  return makeApiRequest('/drive/list', null, 'GET', req, null);
}

async function createDriveConfig(req, drivetype, sharedDriveId, url, userEmail, groupEmail) {
    console.log(`Sending Shared Drive ID: ${sharedDriveId}`);
    return makeApiRequest('/configs/add', null, 'POST', req, {
        storage_type: 'drive',
        drive_type: drivetype,
        shared_drive_id: sharedDriveId,
        url: url,
        impersonate_user: userEmail,
        group: groupEmail
      });
}

async function createGcsConfig(req, project_number, bucket, storageClass, path) {
    return makeApiRequest('/configs/add', null, 'POST', req, {
        storage_type: 'gcs',
        project_number: project_number,
        bucket: bucket,
        prefix: path,
        object_acl: 'private',
        bucket_acl: 'private',
        location: 'us',
        storage_class: storageClass
      });
}

async function createJobConfig(req, srcConfigId, dstConfigId, transfertype, email) {
    return makeApiRequest('/jobs/add', null, 'POST', req, {
        user_type: 'admin', //TODO: call api and make this dynamic
        job_type: transfertype,
        src_config_id: srcConfigId,
        dst_config_id: dstConfigId,
        notify_users: email
      });
}

async function startJob(req, jobId) {
    return makeApiRequest('/jobs/start', null, 'POST', req, {
        job_id: jobId
      });
}

module.exports = {
    validateGroup,
    getSharedDrives,
    createDriveConfig, 
    createGcsConfig, 
    createJobConfig, 
    startJob 
};