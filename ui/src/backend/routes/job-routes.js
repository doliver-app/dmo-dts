// Packages
import express from "express";
// Utils
import { isAuthenticated } from "../utils/auth-utils";
import { getProjectNumber } from "../utils/gcp-utils";
// Helpers
import { createDriveConfig, createGcsConfig, createJobConfig, startJob } from "../helpers/rclone-api-helpers";

const router = express.Router();

export function createJobsRouter() {
  // Process form request
  router.post('/new', isAuthenticated, async (req, res) => {
    try {
      const {
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
      } = req.body;

      // 1. Create google drive config
      const driveConfig = await createDriveConfig({
        user: req.session.email,
        drive_type: drivetype,
        url,
        group: groupEmail,
        impersonate_user: userEmail,
        shared_drive_id: sharedDriveId
      });
      
      // 2. Create Bucket config
      const projectNumber = await getProjectNumber(project_id)

      // If storage class is present, then we should create a new bucket
      const chosenBucket = storageClass ? bucketName : bucket

      const gcsConfig = await createGcsConfig({
        user: req.session.email,
        project_number: projectNumber,
        prefix: path,
        bucket: chosenBucket,
        storage_class: storageClass
      });

      // 3. Create job config
      const jobConfig = await createJobConfig({
        user: req.session.email,
        job_type: transfertype,
        src_config_id: driveConfig.config_id,
        dst_config_id: gcsConfig.config_id,
        notify_users: email
      });
      
      // 4. Start job
      const jobStart = await startJob({
        user: req.session.email,
        job_id: jobConfig.job_id
      });

      if(!jobStart.success) {
        throw new Error(`Job start failed: ${jobStart.message}`)
      }

      return res.status(200).json({
        success: true,
        message: "Job started.",
        data: jobStart
      })
    } catch (error) {
      console.error('Error creating job:', error);

      return res.status(500).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  return router;
}