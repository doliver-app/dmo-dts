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

const { GoogleAuth } = require('google-auth-library');
const config = require('config');

const apiUrl = config.get('app.api');
const auth = new GoogleAuth();

async function fetchIdToken() {
    const targetAudience = `${apiUrl}/`;
    const client = await auth.getIdTokenClient(targetAudience);
  
    const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);
    return idToken;
}

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.email) {
        return next(); // User is authenticated, proceed to the next route
    }
    res.redirect('/'); // Redirect to login if not authenticated
};

module.exports = { 
    fetchIdToken,
    isAuthenticated
};