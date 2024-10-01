import { Router } from "express";
const router = Router()

export function createAuthRoutes(appClient, clientId) {
  // Sign in
  router.post('/sign-in', async (req, res) => {
    try {
      const token = req.body.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Missing authentication token"
        })
      }

      const ticket = await appClient.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

      const payload = ticket.getPayload();

      const email = payload['email'];

      req.session.email = email;

      return res.status(200).json({
        success: true,
        message: "Logged in succesfully.",
        data: {
          ...payload,
          authenticated: true
        }
      });
    } catch (error) {
      console.error('Error verifying token:', error);

      return res.status(401).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  // Sign out 
  router.post('/sign-out', (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          throw err
        } else {
          return res.status(200).json({
            success: true,
            message: "Signed out successfully.",
            data: null
          })
        }
      })
    } catch (error) {
      console.error('Error destroying session:', error);

      return res.status(401).json({
        success: false,
        message: error?.message ?? "Internal Server Error",
        data: null
      })
    }
  });

  // Session
  router.get('/session', (req, res) => {
    return res.status(200).json({
      success: !!req.session.email,
      message: null,
      data: {
        authenticated: !!req.session.email,
        email: req?.session?.email ?? null
      }
    });
  });

  return router
}