import { fetchIdToken } from "../utils/auth-utils";
import config from "config";

const RCLONE_API_URL = config.get('app.api');

// Centralized API Request Function
async function makeApiRequest({
  method,
  endpoint,
  params,
  data,
  user
}) {
  try {
    const idToken = await fetchIdToken();

    let url = `${RCLONE_API_URL}${endpoint}`;

    if (params !== null) {
      url += `?${params}`;
    }

    const request = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      }
    }

    if (method === "POST") {
      request.body = JSON.stringify({ uid: user, ...data })
    }

    const response = await fetch(url, request);
    const result = await response.json();

    if (!result.success) {
      throw new Error(`Request failed: ${result?.message ?? "Unknown Error"}`);
    }

    return result;
  } catch (error) {
    console.error(`Error during ${endpoint} request:`, error);

    throw error
  }
}

export async function validateGroup({
  user,
  groupEmail
}) {
  return makeApiRequest({
    method: "GET",
    endpoint: '/group/validate',
    params: `email=${groupEmail}`,
    data: null,
    user
  });
}

export async function getSharedDrives({
  user
}) {
  return makeApiRequest({
    method: "GET",
    endpoint: '/drive/list',
    params: null,
    data: null,
    user
  });
}

export async function createDriveConfig({
  user,
  drive_type,
  shared_drive_id,
  url,
  impersonate_user,
  group
}) {
  return makeApiRequest({
    method: "POST",
    endpoint: '/configs/add',
    params: null,
    data: {
      scope: 'drive',
      storage_type: 'drive',
      drive_type,
      shared_drive_id,
      url,
      impersonate_user,
      group,
    },
    user
  });
}

export async function createGcsConfig({
  user,
  project_number,
  bucket,
  prefix,
  storage_class
}) {
  return makeApiRequest({
    method: "POST",
    endpoint: '/configs/add',
    params: null,
    data: {
      storage_type: 'gcs',
      project_number,
      bucket,
      prefix,
      object_acl: 'private',
      bucket_acl: 'private',
      location: 'us',
      storage_class
    },
    user
  });
}

export async function createJobConfig({
  user,
  job_type,
  src_config_id,
  dst_config_id,
  notify_users,
}) {
  return makeApiRequest({
    method: "POST",
    endpoint: '/jobs/add',
    params: null,
    data: {
      user_type: 'admin', // TODO: call api and make this dynamic
      job_type,
      src_config_id,
      dst_config_id,
      notify_users
    },
    user
  });
}

export async function startJob({
  user,
  job_id
}) {
  return makeApiRequest({
    method: "POST",
    endpoint: '/jobs/start',
    params: null,
    data: {
      job_id
    },
    user
  });
}