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

const { isAuthenticated } = require('../utils/authUtil');
const express = require('express');
const router = express.Router();
path = require('path');
const config = require('config');
const { getProjectNumber } = require('../utils/gcp');
const { createDriveConfig, createGcsConfig, createJobConfig, startJob} = require('../api/rcloneApiHelpers');


module.exports = (client, clientId) => {
    // Auth
    router.post('/verifyToken', async (req, res) => {
        try {
        const token = req.body.token;
    
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: clientId,
        });
        const payload = ticket.getPayload();
    
        const email = payload['email'];
    
        // Store token values in the session for validation
        req.session.email = email;

        res.sendStatus(200);
        } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).send('Unauthorized'); 
        }
    });

    // Login page
    router.get('/', (req, res) => {
        if(req.session.email) {
            res.redirect('/new'); // Redirect user to new request form if already logged in
        }else {
            res.render('login', { clientId: clientId }); // Render login.ejs and pass Client ID 
        }
    });

    // Export Request Form
    router.get('/new', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'views', 'export_request.html'));
    });

    // Process form request
    router.post('/submit', isAuthenticated, async (req, res, next) => {
        try {
            const { sharedDriveId, url, project_id, bucket, bucketName, storageClass, path, transfertype, drivetype, email, userEmail, groupEmail } = req.body;

            const driveConfig = await createDriveConfig(req, drivetype, sharedDriveId, url, userEmail, groupEmail); // Create Drive config
            const gcsConfig = await createGcsConfig(req, await getProjectNumber(project_id), storageClass ? bucketName : bucket, storageClass, path); // Create GCS config
            const jobConfig = await createJobConfig(req, driveConfig.config_id, gcsConfig.config_id, transfertype, email); // Create job config
            const jobStart = await startJob(req, jobConfig.job_id); // Start job

            // Redirect to history page on success
            if(jobStart.success == true) {
                res.redirect('/history');
            }else {
                throw new Error(`Job start failed: ${jobStart.message}`);
            }
        } catch (error) {
            next(error); // Pass the error to the error handling middleware
        }
    });

    // Export History Page
    router.get('/history', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'views', 'export_history.html')); 
    });

    // Logout 
    router.get('/logout', (req, res) => {
        req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Logout failed');
        } else {
            res.redirect('/'); //Redirect to login after user logs out
        }
        });
    });
    return router; 
}