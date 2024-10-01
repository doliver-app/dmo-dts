// React
import { createContext, useEffect, useState } from "react";
// API
import { signOut } from "../api/sign-out";
import { signIn } from "../api/sign-in"
import { session } from "../api/session"

const DEFAULT_PROPS = {
  email: "",
  isAuthenticated: false,
  signInWithGoogle: async () => null,
  signOut: async () => null,
  sessionLoading: true,
};

export const AuthContext = createContext(DEFAULT_PROPS);

export const AuthProvider = ({ children }) => {
  // User states
  const [email, setEmail] = useState(DEFAULT_PROPS.email);
  const [isAuthenticated, setIsAuthenticated] = useState(DEFAULT_PROPS.isAuthenticated);
  const [sessionLoading, setSessionLoading] = useState(DEFAULT_PROPS.sessionLoading);

  useEffect(() => {
    // Check if the user is already authenticated on mount
    async function checkSession() {
      setSessionLoading(true);

      try {
        const response = await session()

        if (response.success) {
          setIsAuthenticated(response.data.authenticated);
          setEmail(response.data.email);
        } else {
          setIsAuthenticated(false);
          setEmail("");
        }
      } catch (error) {
        console.error("Error checking session:", error);

        setIsAuthenticated(false);
        setEmail("");
      } finally {
        setSessionLoading(false);
      }
    }

    checkSession();
  }, []);

  const signInWithGoogle = async (google) => {
    setSessionLoading(true);

    try {
      const response = await signIn(google.credential)

      if (!response.success) {
        throw new Error("Google Invalid token");
      }

      setIsAuthenticated(response.data.authenticated);
      setEmail(response.data.email);
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      
      appSignOut()
    } finally {
      setSessionLoading(false);
    }
  };

  const appSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);

    } catch (error) {
      console.error(error)
      location?.reload?.()
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, sessionLoading, signInWithGoogle, signOut: appSignOut, email }}
    >
      {children}
    </AuthContext.Provider>
  );
};
