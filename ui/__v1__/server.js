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
const config = require('config');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase-admin/app');
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');
var randomstring = require("randomstring");
const { getSecret } = require('./utils/secretManager');

const app = express();

const port = process.env.PORT || config.get('app.port');
const projectId = config.get('firestore.dbConfig.projectId');

let client = null;
let clientId = null;

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

// Initialize firebase
initializeApp({projectId : projectId});

// Initialize Client ID
async function initializeClientId() {
    clientId = await getSecret(`projects/${projectId}/secrets/${config.get('secret.clientId')}/versions/latest`);
    return clientId;
}

app.set('trust proxy', true); //TODO: Make this more restrictive  

// Session middleware
app.use(session({
    secret: randomstring.generate(),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 30 * 60 * 1000 // 30 minutes in milliseconds 
    } 
}));

// EJS as the view engine
app.set('view engine', 'ejs'); // Set EJS as templating engine
app.set('views', __dirname + '/views'); // Set the views directory

initializeClientId().then(clientId => {
    client = new OAuth2Client(clientId);

    // Pass clientId to the router
    app.use('/', require('./routes/index')(client, clientId)); 
})


// Error handling middleware
// TODO: Handle errors gracefully in front end
app.use((err, req, res, next) => {
  console.error(err);   
  res.status(500).json({ error: 'An error occurred' });
});

app.use('/data', require('./routes/dataRoutes'));

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});