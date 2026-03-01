import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { DataProvider, useData } from "./contexts/DataContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
// Lazy load components
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const SetPassword = lazy(() => import("./pages/SetPassword").then(m => ({ default: m.SetPassword })));
const AuthenticatedApp = lazy(() => import("./components/AuthenticatedApp").then(m => ({ default: m.AuthenticatedApp })));

import { Toaster } from "./components/ui/Toaster";
import { LoadingIndicator } from "./components/ui/LoadingIndicator";
import {
  Loader2,
  AlertCircle,
  LogOut,
} from "lucide-react";

const AppContent: React.FC = () => {
  const {
    currentUser,
    currentDriver,
    isCarrier,
    isAdmin,
    loading: authLoading,
    signOut,
  } = useAuth();
  const {
    currentFacilityId,
    setCurrentFacilityId,
    allowedFacilities,
    theme,
    dataLoading,
  } = useData();

  const [appState, setAppState] = useState("loading");

  useEffect(() => {
    if (theme === "dark")
      document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Sync appState based on authentication and data
  useEffect(() => {
    if (authLoading) return;

    // Cases where we skip the facility-selection / initial-loading logic
    if (currentDriver || isCarrier) {
      if (appState !== "app") setAppState("app");
      return;
    }

    if (!currentUser) {
      // Handled by return statement below
      return;
    }

    // Yard Staff / Admin logic
    if (currentFacilityId || isAdmin) {
      if (appState !== "app") setAppState("app");
    } else {
      if (allowedFacilities.length > 0)
        handleSetFacility(allowedFacilities[0].id);
      else if (!dataLoading) setAppState("no-access");
    }
  }, [
    currentUser,
    currentDriver,
    isCarrier,
    currentFacilityId,
    allowedFacilities,
    dataLoading,
    authLoading,
    appState
  ]);

  const handleSetFacility = (id: string) => {
    setCurrentFacilityId(id);
  };

  if (authLoading)
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121212]">
        <Loader2 className="w-12 h-12 text-[#0a84ff] animate-spin mb-4" />
        <p className="text-slate-500 dark:text-gray-400 font-medium">
          Authenticating...
        </p>
      </div>
    );

  // Check if this is a password set flow (token in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const passwordToken = urlParams.get('token');
  if (passwordToken && !currentUser) {
    return (
      <Suspense fallback={<LoadingIndicator fullScreen message="Loading..." />}>
        <Toaster />
        <SetPassword />
      </Suspense>
    );
  }

  if (!currentUser && !currentDriver) {
    return (
      <Suspense fallback={<LoadingIndicator fullScreen message="Loading Login..." />}>
        <Login />
      </Suspense>
    );
  }

  if (appState === "loading")
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121212]">
        <Loader2 className="w-12 h-12 text-[#0a84ff] animate-spin mb-4" />
        <p className="text-slate-500 dark:text-gray-400 font-medium">
          Initializing SwiftYard...
        </p>
      </div>
    );

  if (appState === "no-access")
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#121212] p-8 text-center">
        <div className="bg-amber-500/10 p-6 rounded-3xl border border-amber-500/20 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Pending Assignment
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mb-6">
            Please reach out to an admin for facility/carrier assignment and try logging in later.
          </p>
          <button
            onClick={() => signOut()}
            className="px-6 py-2 bg-[#0a84ff] hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center mx-auto transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    );

  return (
    <Suspense fallback={<LoadingIndicator fullScreen message="Loading SwiftYard..." />}>
      <AuthenticatedApp />
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY || "missing_key"}>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </ClerkProvider>
  );
};

export default App;
