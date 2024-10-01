import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Access secret in Secret Manager
export async function getSecret(name) {
  const secretManagerclient = new SecretManagerServiceClient();

  const [accessResponse] = await secretManagerclient.accessSecretVersion({ name });

  return accessResponse.payload.data.toString('utf8'); // Return the actual secret value
}