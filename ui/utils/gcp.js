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

const { ProjectsClient } = require('@google-cloud/resource-manager');

const projectsClient = new ProjectsClient();

// Get Project Number from Project ID
async function getProjectNumber(projectId) {
    try {
      const [project] = await projectsClient.getProject({
        name: `projects/${projectId}`,
      });
      return project.name.split('/')[1];
    } catch (error) {
      console.error('Error getting project details:', error);
      throw error; 
    }
}

module.exports = { 
    getProjectNumber
};