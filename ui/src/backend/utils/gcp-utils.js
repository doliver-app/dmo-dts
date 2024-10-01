import { ProjectsClient } from "@google-cloud/resource-manager";

const projectsClient = new ProjectsClient();

// Get Project Number from Project ID
export async function getProjectNumber(projectId) {
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