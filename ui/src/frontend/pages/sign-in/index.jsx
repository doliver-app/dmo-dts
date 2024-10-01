// This snippet helps VSCode intelissense intentify Google's external login script

// React
import { Fragment, useEffect, useRef, useState } from "react";
// Mui
import { Box, Container, Typography } from "@mui/material";
// Auth
import { useAuth } from "../../hooks/use-auth";
import { getClientId } from "../../api/get-client-id";
// Helpers
import { Helmet } from 'react-helmet-async'

export function SignInPage() {
  const { signInWithGoogle } = useAuth();
  const googleSignInButtonRef = useRef(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    const checkGoogleScriptLoaded = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        setIsGoogleScriptLoaded(true);
      } else {
        setTimeout(checkGoogleScriptLoaded, 100); // Check again after 100ms
      }
    };

    checkGoogleScriptLoaded();
  }, []);

  useEffect(() => {
    async function initializeGoogleSignInButton(retryCount = 0) {
      if (!googleSignInButtonRef.current || !isGoogleScriptLoaded) return;

      try {
        const data = await getClientId();

        if (!data?.clientId) {
          if (retryCount < 5) {
            setTimeout(() => initializeGoogleSignInButton(retryCount + 1), 1000);
            
            return;
          }

          throw new Error("No client ID found after 3 attempts");
        }

        const { current: buttonRef } = googleSignInButtonRef;

        window.google.accounts.id.initialize({
          client_id: data.clientId,
          callback: signInWithGoogle,
        });

        window.google.accounts.id.renderButton(buttonRef, {
          theme: "outline",
          size: "large",
        });
      } catch (error) {
        console.error(error);
      }
    }

    initializeGoogleSignInButton();
  }, [googleSignInButtonRef, isGoogleScriptLoaded, signInWithGoogle]);

  return (
    <Fragment>
      <Helmet title="Sign in" /> 

      <Container
        maxWidth="xs"
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          textAlign: "center",
          p: 2,
        }}
      >
        <Box sx={{ mb: 1 }}>
          <img
            width={120}
            src="https://www.gstatic.com/devrel-devsite/prod/v0e0f589edd85502a40d78d7d0825db8ea5ef3b99ab4070381ee86977c9168730/cloud/images/cloud-logo.svg"
            alt="Google Cloud Logo"
          />
        </Box>

        <Typography variant="h4" sx={{ mb: 4 }}>
          Weatherlight
        </Typography>

        <Box ref={googleSignInButtonRef} sx={{ mb: 2 }}>
          {!isGoogleScriptLoaded && (
            <Typography variant="body2" color="textSecondary">
              Loading sign-in button...
            </Typography>
          )}
        </Box>
      </Container>
    </Fragment>
  );
}
