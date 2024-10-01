import "dotenv/config"
import dotenv from "dotenv"

dotenv.config()

/* global process */
/* global __dirname */

// Packages
import express from "express"
import config from "config"
import bodyParser from "body-parser"
import session from "express-session"
import randomstring from "randomstring"
// Google
import { initializeApp, getApps } from "firebase-admin/app";
import { OAuth2Client } from "google-auth-library";
import { getSecret } from "./utils/secret-manager-utils";
// Routes
import { createDataRouter } from "./routes/data-routes"
import { createJobsRouter } from "./routes/job-routes"
import { createAuthRoutes } from "./routes/auth-routes"
// Utils
import path from "path";

export const app = express();

const port = process.env.PORT || config.get('app.port');
const projectId = config.get('firestore.dbConfig.projectId');

let client = null;
let clientId = null;

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Client ID
async function initializeClientId() {
  clientId = await getSecret(`projects/${projectId}/secrets/${config.get('secret.clientId')}/versions/latest`);
  return clientId;
}

// Initialize firebase
if (!getApps().length) {
  initializeApp({ projectId });
}

app.set('trust proxy', true); // TODO: Make this more restrictive  

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

initializeClientId().then(clientId => {
  client = new OAuth2Client(clientId);

  // Auth Routes
  app.use('/api/auth', createAuthRoutes(client))
  // Data Routes
  app.use('/api/data', createDataRouter(client))
  // Job Routes
  app.use('/api/jobs', createJobsRouter(client))

  app.get("/api/client-id", (_, res) => {
    res.json({ clientId })
  })

  if (!process.env['VITE']) {
    const root = path.join(__dirname);
    app.use(express.static(root));
    
    app.use("/*", (req, res) => {
      res.sendFile(path.join(__dirname, "index.html"));
    });
    
    app.listen(port, () => console.log(`Server listening on port: ${port}`))
  }
})