// Packages
import express from "express";
import config from "config";
// Google
import { Storage } from "@google-cloud/storage";
import { getFirestore } from "firebase-admin/firestore";
// Utils
import { isAuthenticated } from "../utils/auth-utils";
import { validateGroup, getSharedDrives } from "../helpers/rclone-api-helpers"

const router = express.Router();

const FIRESTORE_DATABASE_NAME = config.get('firestore.dbConfig.dbName');
const FIRESTORE_COLLECTION_NAME = config.get('firestore.dbConfig.configName');;

export function createDataRouter() {
  const db = getFirestore(FIRESTORE_DATABASE_NAME);

  // Get GCS buckets
  router.get('/get-buckets', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId || '';

      if(!projectId) {
        return res.status(400).json({
          success: false,
          message: "Missing project ID.",
          data: []
        })
      }

      const storage = new Storage({ projectId: projectId.trim()});
      const [bucketsResponse] = await storage.getBuckets();
      const bucketNames = bucketsResponse.map(bucket => bucket.name);

      return res.status(200).json({
        success: true,
        message: null,
        data: bucketNames
      })
    } catch (error) {
      console.error('Error fetching buckets:', error);

      return res.status(500).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  // Get Google Group
  router.get('/get-group', isAuthenticated, async (req, res) => {
    try {
      const groupEmail = req.query.groupEmail || '';

      if(!groupEmail) {
        return res.status(400).json({
          success: false,
          message: "Missing Group E-mail.",
          data: null
        })
      }

      const group = await validateGroup({ 
        user: req.session.email, 
        groupEmail
      });

      if(!group.success) {
        throw new Error("Invalid Group.")
      }

      return res.status(200).json({
        success: true,
        message: null,
        data: group
      })
    } catch (error) {
      console.error('Error fetching group:', error);

      return res.status(500).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  // Get Shared Drives
  router.get('/get-shared-drives', isAuthenticated, async (req, res) => {
    try {
      const response = await getSharedDrives({ user: req.session.email });

      return res.status(200).json({
        success: true,
        message: null,
        data: response.shared_drives ?? []
      })
    } catch (error) {
      console.error('Error fetching Shared Drives:', error);

      return res.status(500).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  // Firestore read
  router.get('/get-jobs', isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Get the page number default to 1
      const limit = parseInt(req.query.limit) || 10; // Get the limit (number of items per page) default to 10

      // Calculate the offset
      const offset = (page - 1) * limit;

      // Query job history table
      let query = db.collection(FIRESTORE_COLLECTION_NAME)
        .where('user_id', '==', req.session.email) // Filter jobs created by logged in user
        .orderBy('job_started', 'desc') // Order by job_started desc
        .offset(offset) // Apply offset based on the page number
        .limit(limit); // Apply the limit

      const snapshot = await query.get();

      const tableData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Parse fields for job history web UI
        const job_type = data['job_type'];
        const src_name = data['src_name'];
        const dst_name = data['dst_name'];
        const status = data['status'];
        const job_started = data['job_started'] ? new Date(data['job_started'].seconds * 1000) : null;
        const job_completed = data['job_completed'] ? new Date(data['job_completed'].seconds * 1000) : null;

        // Prepare table data row
        tableData.push({
          job_type,
          src_name,
          dst_name,
          status,
          job_started,
          job_completed
        });
      });

      // Get the total number of documents for pagination
      const totalDocsSnapshot = await db.collection(FIRESTORE_COLLECTION_NAME).where('user_id', '==', req.session.email).count().get();
      const totalDocs = totalDocsSnapshot.data().count;
      const totalPages = Math.ceil(totalDocs / limit);

      // Send the table data to the frontend
      return res.status(200).json({
        success: true,
        message: null,
        data: {
          rows: tableData,
          totalRows: totalDocs,
          currentPage: page,
          totalPages,
        }
      })
    } catch (error) {
      console.error('Error fetching jobs:', error);

      return res.status(500).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  return router;
}