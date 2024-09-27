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

// Drive Type
const sharedDrive = document.getElementById('sharedDrive');
const myDrive = document.getElementById('myDrive');
const group = document.getElementById('group');

// Drive Scope
const singleFolder = document.getElementById('singlefolder');
const singleFile = document.getElementById('singlefile');
const fullDrive = document.getElementById('fulldrive');

// Input Fields
const sharedDriveInput = document.getElementById('sharedDriveInput');
const sharedDriveSelect = document.getElementById('sharedDriveId');

const urlInput = document.getElementById('urlInput');
const urlField = document.getElementById('url');

const userEmailInput = document.getElementById('userEmailInput');
const userEmailField = document.getElementById('userEmail');

const groupEmailInput = document.getElementById('groupEmailInput');
const groupEmailField = document.getElementById('groupEmail');
const groupId = document.getElementById('groupId');

let bucketSelect = document.getElementById('bucket');
let projectIDInput = document.getElementById('project_id'); 

const bucketNameInput = document.getElementById('bucketNameInput');
const bucketName = document.getElementById('bucketName');

const storageClassInput = document.getElementById('storageClassInput');
const storageClass = document.getElementById('storageClass');


// Load Spinner
const loadingSpinner = document.getElementById('loading-spinner'); 

// Hide new fields by default
sharedDriveInput.style.display = 'none';
urlInput.style.display = 'none';
userEmailInput.style.display = 'none';
groupEmailInput.style.display = 'none';
bucketNameInput.style.display = 'none';
storageClassInput.style.display = 'none';

bucketName.required = false;
storageClass.required = false;

// Show User Email and Drive URL based on user selection
// Rules:
// 1) When Shared Drive selected, url input is displayed
// 2) When My Drive and Full Drive selected, email input is displayed
// 3) When My Drive and Single Folder or Single File selected, both url and email input are displayed
// 4) When Group Export is selected, group email input is displayed and single file & folder options are disabled
function updateInputFields() {
    singleFile.disabled = false;
    singleFolder.disabled = false;
    if (sharedDrive.checked && fullDrive.checked) {
        sharedDriveInput.style.display = 'block';
        urlInput.style.display = 'none';
        userEmailInput.style.display = 'none';
        groupEmailInput.style.display = 'none';
        sharedDriveSelect.required = true;
        urlField.required = false;
        userEmailField.required = false;
        groupEmailField.required = false;
    } 
    else if (sharedDrive.checked && singleFolder.checked) {
        sharedDriveInput.style.display = 'block';
        urlInput.style.display = 'block';
        userEmailInput.style.display = 'none';
        groupEmailInput.style.display = 'none';
        sharedDriveSelect.required = true;
        urlField.placeholder = 'Folder URL';
        urlField.required = true;
        userEmailField.required = false;
        groupEmailField.required = false;
    }
    else if (sharedDrive.checked && singleFile.checked) {
        sharedDriveInput.style.display = 'block';
        urlInput.style.display = 'block';
        userEmailInput.style.display = 'none';
        groupEmailInput.style.display = 'none';
        sharedDriveSelect.required = true;
        urlField.placeholder = 'File URL';
        urlField.required = true;
        userEmailField.required = false;
        groupEmailField.required = false;
    }
    else if (myDrive.checked && fullDrive.checked) {
        userEmailInput.style.display = 'block';
        groupEmailInput.style.display = 'none';
        sharedDriveInput.style.display = 'none';
        urlInput.style.display = 'none';
        userEmailField.required = true;
        sharedDriveSelect.required = false;
        urlField.required = false;
        groupEmailField.required = false;
    }
    else if (group.checked) {
        userEmailInput.style.display = 'none';
        groupEmailInput.style.display = 'block';
        sharedDriveInput.style.display = 'none';
        urlInput.style.display = 'none';
        userEmailField.required = false;
        sharedDriveSelect.required = false;
        urlField.required = false;
        groupEmailField.required = true;
        singleFile.disabled = true;
        singleFolder.disabled = true;
        singleFile.checked = false;
        singleFolder.checked = false;
    }
    else if (myDrive.checked && singleFolder.checked) {
        userEmailInput.style.display = 'block';
        groupEmailInput.style.display = 'none';
        sharedDriveInput.style.display = 'none';
        urlInput.style.display = 'block';
        userEmailField.required = true;
        sharedDriveSelect.required = false;
        urlField.placeholder = 'Folder URL';
        urlField.required = true;
        groupEmailField.required = false;
    } 
    else if (myDrive.checked && singleFile.checked) {
        userEmailInput.style.display = 'block';
        groupEmailInput.style.display = 'none';
        sharedDriveInput.style.display = 'none';
        urlInput.style.display = 'block';
        userEmailField.required = true;
        sharedDriveSelect.required = false;
        urlField.placeholder = 'File URL';
        urlField.required = true;
        groupEmailField.required = false;
    }
    else {
        sharedDriveInput.style.display = 'none';
        urlInput.style.display = 'none';
        userEmailInput.style.display = 'none';
        groupEmailInput.style.display = 'none';
        sharedDriveSelect.required = false;
        urlField.required = false;
        userEmailField.required = false;
        groupEmailField.required = false;
    }
}

// Spinner on Submit
function showLoadingSpinner() {
    loadingSpinner.style.display = 'flex'; // Show the loading spinner
}
  
function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none'; // Hide the loading spinner
}

// Get list of buckets for given project
function fetchBuckets(projectId) {
    fetch(`/data/get-buckets?projectId=${projectId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(bucketNames => {
            const option = document.createElement('option');
            option.value = 'create-new-bucket';
            option.text = '-- Create New Bucket --';
            bucketSelect.add(option);
            bucketNames.forEach(bucketName => {
                const option = document.createElement('option');
                option.value = bucketName;
                option.text = bucketName;
                bucketSelect.add(option);
            });
        })
        .catch(error => {
            console.error('Error fetching buckets:', error);
        });
}

// Get group ID for a given group email address
function getGroup(groupEmail) {
    fetch(`/data/get-group?groupEmail=${groupEmail}`)
        .then(response => {
            return response.json();
        })
        .then(validatedGroupResponse => {
            console.log(validatedGroupResponse);
        })
        .catch(error => {
            // TODO: Red border on Group Email field and prevent form submission
            console.error('Error fetching group:', error);
        });
}

// Get Shared Drives 
function getSharedDrives() {
    fetch(`/data/get-shared-drives`)
        .then(response => {
            // if (!response.ok) {
            //     throw new Error('Network response was not ok');
            // }
            // const sharedDrivesResponse = await response.json();
            // console.log(`Shared Drives Response: ${sharedDrivesResponse}`);
            // const sharedDrives = response.shared_drives
            return response.json();
        })
        .then(sharedDriveResponse => {
            console.log(sharedDriveResponse);
            const sharedDrives = sharedDriveResponse.shared_drives;
            console.log(sharedDrives);
            // option.value = 'create-new-bucket';
            // option.text = '-- Create New Bucket --';
            // bucketSelect.add(option);
            sharedDrives.forEach(sharedDrive => {
                const option = document.createElement('option');
                option.value = sharedDrive.id;
                option.text = sharedDrive.name;
                sharedDriveSelect.add(option);
            });
        })
        .catch(error => {
            console.error('Error fetching shared drives:', error);
        });
}

// Show create new bucket fields
function showCreateNewBucketFields() {
    bucketNameInput.style.display = 'block';
    storageClassInput.style.display = 'block';
    bucketName.required = true;
    storageClass.required = true;
}

// Hide create new bucket fields
function hideCreateNewBucketFields() {
    bucketNameInput.style.display = 'none';
    storageClassInput.style.display = 'none';
    bucketName.required = false;
    storageClass.required = false;
}

// Event listener to show/hide User Email and Drive URL fields
sharedDrive.addEventListener('change', updateInputFields);
myDrive.addEventListener('change', updateInputFields);
group.addEventListener('change', updateInputFields);
fullDrive.addEventListener('change', updateInputFields);
singleFolder.addEventListener('change', updateInputFields);
singleFile.addEventListener('change', updateInputFields);

// Event listener to show the spinner on submit
const form = document.querySelector('form');
form.addEventListener('submit', showLoadingSpinner);

// Event listener for project number input
projectIDInput.addEventListener('change', () => { 
    // Clear existing options except the first ("Select Bucket")
    while (bucketSelect.options.length > 1) { 
        bucketSelect.remove(1); 
    }
    fetchBuckets(projectIDInput.value);
});

groupEmailField.addEventListener('change', () => {
    getGroup(groupEmailField.value);
});

// Event listener for Shared Drive dropdown
sharedDrive.addEventListener('change', () => {
    // Clear existing options
    while (sharedDriveSelect.options.length > 1) { 
        sharedDriveSelect.remove(1); 
    }
    getSharedDrives();
});

// Event listner for bucket dropdown
bucketSelect.addEventListener('change', () => {
    if(bucketSelect.value == 'create-new-bucket') {
        showCreateNewBucketFields();
    }else {
        hideCreateNewBucketFields();
    }
});

// Event listner for Shared Drive dropdown
sharedDriveSelect.addEventListener('change', () => {
    console.log(`Selected Shared Drive ID: ${sharedDriveSelect.value}`);
});

// Event listener for document
// document.addEventListener('DOMContentLoaded', () => {
// });
