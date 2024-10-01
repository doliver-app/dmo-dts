// Auth Context
import { useAuth } from "../../hooks/use-auth"
// Mui
import { Box } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
// React Router
import { Navigate, Outlet } from "react-router-dom";

export function GuestRoute() {
  const {sessionLoading, isAuthenticated} = useAuth()

  if (sessionLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: 2,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/exports" replace />;
  }

  return <Outlet />
}