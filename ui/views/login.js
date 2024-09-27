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

function handleCredentialResponse(response) {
    // Send token to server for verification
    fetch('/verifyToken', { 
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential })
    })
    .then((response) => {
        if (response.ok) {
            console.log('Token verification successful.');
            // Redirect to the new export request form on success
            window.location.href = '/new';
        } else {
            console.error('Token verification failed.');
        }
    })
    .catch((error) => {
        console.error('Error sending token to server:', error);
    });
}