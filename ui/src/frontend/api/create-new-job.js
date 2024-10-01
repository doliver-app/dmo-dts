import { api } from "../lib/api"

export async function createNewJob({
  url,
  project_id,
  bucket,
  bucketName,
  storageClass,
  path,
  transfertype,
  drivetype,
  email,
  userEmail,
  groupEmail,
  sharedDriveId
}) {
  const { data } = await api.post("/jobs/new",
    { 
      url,
      project_id,
      bucket,
      bucketName,
      storageClass,
      path,
      transfertype,
      drivetype,
      email,
      userEmail,
      groupEmail,
      sharedDriveId
    }
  )
  
  return data
}