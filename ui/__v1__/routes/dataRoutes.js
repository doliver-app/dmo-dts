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

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../utils/authUtil');
const config = require('config');
const { getFirestore } = require('firebase-admin/firestore');
const { Storage } = require('@google-cloud/storage');
const { validateGroup, getSharedDrives } = require('../api/rcloneApiHelpers');

let storage = new Storage();
const dbName = config.get('firestore.dbConfig.dbName');
const configName = config.get('firestore.dbConfig.configName');
const db = getFirestore(databaseId = dbName);

// Get GCS buckets
router.get('/get-buckets', isAuthenticated, async (req, res) => {
    try {
        const projectId = req.query.projectId || '';
        let buckets;

        if (projectId) {
            // Fetch buckets for the specified project
            storage = new Storage({
                projectId: projectId.trim(),
            });
            const [bucketsResponse] = await storage.getBuckets();
            buckets = bucketsResponse;
            const bucketNames = buckets.map(bucket => bucket.name);
            res.json(bucketNames); 
        } 
    } catch (error) {
        console.error('Error fetching buckets:', error);
        res.status(500).send('Error fetching buckets');
    }           
});

// Get Google Group
router.get('/get-group', isAuthenticated, async (req, res) => {
    try {
        const groupEmail = req.query.groupEmail || '';

        if (groupEmail) {
            const response = await validateGroup(req, groupEmail);
            console.log(JSON.stringify(response));
            return res.status(200).json(response);
            // if (response.status === 200) {
            //     return res.status(200).json(response.data)
            // } else {
            //     // The failure
            //     return res.status(400).json(response.data)
            // }
        } else {
            res.status(400).send('Missing groupEmail parameter');
        }
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).send('Error fetching group');
    }
});

// Get Shared Drives
router.get('/get-shared-drives', isAuthenticated, async (req, res) => {
    try {
        const response = await getSharedDrives(req);
        console.log(JSON.stringify(response));
        return res.status(200).json(response);
        // if (response.status === 200) {
        //     return res.status(200).json(response.data)
        // } else {
        //     // The failure
        //     return res.status(400).json(response.data)
        // }
    } catch (error) {
        console.error('Error listing Shared Drives:', error);
        res.status(500).send('Error listing Shared Drives');
    }
});

// Firestore read
router.get('/read-data', isAuthenticated, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        let startAfter = req.query.startAfter || null;
        let nextPageCursor = null;

        // Query job history table
        let query = db.collection(configName)
            .where('user_id', '==', req.session.email) //filter jobs created by logged in user
            .orderBy('job_started', 'desc'); // order by job_started desc
        
        // Apply the cursor if it exists
        if (startAfter !== null) { 
            const cursorDoc = await db.collection(configName).doc(startAfter).get();
            if (cursorDoc.exists) { // Check if the document exists
                const cursorTimestamp = cursorDoc.data().job_started;
                query = query.startAfter(cursorTimestamp); 
            } else {
                console.error('Cursor document not found:', startAfter);
            }
        }

        // Apply the limit
        query = query.limit(limit);

        const snapshot = await query.get();

        const tableData = [];
        snapshot.forEach(async (doc) => {
            const data = doc.data();
            // Parse fields for job history web ui
            const job_type = data['job_type'];
            const src_name = data['src_name'];
            const dst_name = data['dst_name'];
            const status = data['status'];
            const job_started = (data['job_started'] === null) ? null : new Date(data['job_started'].seconds*1000);
            const job_completed = (data['job_completed'] === null) ? null : new Date(data['job_completed'].seconds*1000);

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

        // Get the last document for the next page cursor
        if (snapshot.docs.length > 0) {
            let lastDoc = snapshot.docs[snapshot.docs.length - 1];
            nextPageCursor = lastDoc.id;
        }

        // Get the total number of documents for pagination
        const totalDocsSnapshot = await db.collection(configName).where('user_id', '==', req.session.email).count().get();
        const totalDocs = totalDocsSnapshot.data().count;
        const totalPages = Math.ceil(totalDocs / limit);

        // Send the table data to the frontend
        res.send({ 
            tableData, 
            totalPages,
            nextPageCursor
        });
    } catch (error) {
        console.error('Error reading data from Firestore:', error);
        next(error);
    }
});

module.exports = router;
