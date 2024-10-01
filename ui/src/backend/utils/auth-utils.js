import { GoogleAuth } from "google-auth-library";
import config from "config";

const RCLONE_API_URL = config.get('app.api');
const auth = new GoogleAuth();

export async function fetchIdToken() {
  const targetAudience = `${RCLONE_API_URL}/`;
  const client = await auth.getIdTokenClient(targetAudience);

  const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);
  return idToken;
}

// Authentication middleware
export function isAuthenticated(req, res, next) {
  if (req.session.email) {
    return next();
  }

  res.status(401).json({
    message: "Forbidden",
    code: "UNAUTHORIZED"
  })
};