import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "./pages/HomePage";
import MainPage from "./pages/MainPage";
import "./styles.css";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/main",
    element: (
      <ProtectedRoute>
        <MainPage />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-vvufctniwl0ae1qu.us.auth0.com"
      clientId="JpXBwgir2wYdcNxKq4xHLePx3xn254f5"
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: window.location.origin + "/main",
      }}
    >
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>
    </Auth0Provider>
  </React.StrictMode>
);
