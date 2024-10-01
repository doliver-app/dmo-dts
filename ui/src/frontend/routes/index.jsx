// Router
import { createBrowserRouter } from "react-router-dom";
// Pages
import { SignInPage } from "../pages/sign-in";
import { ExportsPage } from "../pages/export";
// Providers
import { Providers } from "../providers";
import { AuthRoute } from "./helpers/auth-route";
import { GuestRoute } from "./helpers/guest-route";

export const router = createBrowserRouter([
  {
    element: <Providers />,
    path: "/",
    children: [
      // Guest Routes
      {
        element: <GuestRoute />,
        path: "/",
        children: [
          {
            path: "/",
            element: <SignInPage />,
          }
        ]
      },
      // Auth Routes
      {
        element: <AuthRoute />,
        path: "/exports",
        children: [
          {
            path: "/exports",
            element: <ExportsPage />,
          }
        ]
      },
    ],
  },
], {
  basename: "/"
});