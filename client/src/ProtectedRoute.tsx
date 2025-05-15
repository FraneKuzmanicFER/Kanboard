// src/components/ProtectedRoute.tsx
import React, { JSX } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import Loading from "./utils/Loader";

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: location.pathname },
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, location]);

  if (isLoading || !isAuthenticated) {
    return <Loading />;
  }

  return children;
};

export default ProtectedRoute;
