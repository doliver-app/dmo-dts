// Providers
import { AuthProvider } from "./contexts/auth-context";
import { QueryClientProvider } from "react-query";
import { Helmet, HelmetProvider } from 'react-helmet-async'
// React Router
import { Outlet } from "react-router-dom";

import { queryClient } from "./lib/react-query";

export function Providers() {
  return (
    <HelmetProvider>
     <Helmet titleTemplate="%s | Weatherlight" />

      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
