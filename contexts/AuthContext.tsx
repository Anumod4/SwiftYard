import React, { createContext, useContext, useEffect, useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { UserProfileData, Driver, Trailer, Carrier } from "../types";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "../services/api";

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  updateProfile: (args: {
    displayName?: string;
    photoURL?: string;
  }) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfileData | null;
  currentDriver: Driver | null;
  currentCarrier: Carrier | null;
  loading: boolean;
  login: (
    identifier: string,
    pass: string,
    mode?: "staff" | "carrier",
    facilityId?: string,
  ) => Promise<void>;
  signup: (
    email: string,
    pass: string,
    facilityId: string,
    role?: string,
    carrierId?: string,
  ) => Promise<void>;
  clerkLogin: (
    token: string,
    mode?: "staff" | "carrier",
    facilityId?: string,
  ) => Promise<void>;
  clerkSignup: (
    token: string,
    facilityId: string,
    role?: string,
    carrierId?: string,
    firstName?: string,
    lastName?: string,
    username?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  driverLogin: (trailerNumber: string) => Promise<Driver[]>;
  selectDriver: (driver: Driver) => void;
  updateUserProfile: (data: Partial<UserProfileData>) => Promise<void>;
  isAdmin: boolean;
  isCarrier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const clerk = useClerk();
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentCarrier, setCurrentCarrier] = useState<Carrier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createAuthUser = (
    uid: string,
    email: string,
    displayName: string,
    photoURL: string = "",
  ): AuthUser => {
    return {
      uid,
      email,
      displayName,
      photoURL,
      updateProfile: async (args) => {
        const response = await api.auth.updateProfile(args);
        if (response.success && response.data) {
          const newProfile = { ...userProfile, ...args } as UserProfileData;
          setCurrentUser((prev) => (prev ? { ...prev, ...args } : null));
          setUserProfile(newProfile);
        }
      },
      updateEmail: async (newEmail) => {
        const response = await api.auth.updateProfile({ email: newEmail });
        if (response.success) {
          setCurrentUser((prev) =>
            prev ? { ...prev, email: newEmail } : null,
          );
          setUserProfile((prev) =>
            prev ? { ...prev, email: newEmail } : null,
          );
        }
      },
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedDriver = localStorage.getItem("swiftyard_driver");
        if (storedDriver) setCurrentDriver(JSON.parse(storedDriver));

        // Check if we have a token and validate it
        const token = api.auth.getToken();
        if (token) {
          try {
            const response = await api.auth.getCurrentUser();
            if (response.success && response.data) {
              const { user, carrier } = response.data;
              setUserProfile(user as UserProfileData);
              setCurrentUser(
                createAuthUser(
                  user.uid,
                  user.email,
                  user.displayName,
                  user.photoURL || "",
                ),
              );
              if (carrier) setCurrentCarrier(carrier as Carrier);
            } else {
              // Token invalid, clear
              api.auth.logout();
            }
          } catch (err: any) {
            console.error("Token validation failed:", err);
            api.auth.logout();
          }
        }
      } catch (err: any) {
        console.error("Auth Init Error:", err);
        setError("Database connection failed.");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    identifier: string,
    pass: string,
    mode: "staff" | "carrier" = "staff",
    facilityId?: string,
  ) => {
    // Resolve facilityId: prefer explicit arg, else localStorage
    let fid = facilityId || localStorage.getItem("swiftyard_facility_id");
    if (fid && fid === 'null') fid = undefined;
    // Persist for subsequent requests
    if (fid) {
      localStorage.setItem("swiftyard_facility_id", fid);
    }

    const response = await api.auth.login({ identifier, password: pass, mode, facilityId: fid });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Login failed");
    }

    const { user } = response.data;

    setCurrentUser(createAuthUser(user.uid, user.email, user.displayName, ""));
    setUserProfile(user as UserProfileData);

    // If API returned a specific facility (locked in token), update localStorage
    if (user.facilityId) {
      localStorage.setItem("swiftyard_facility_id", user.facilityId);
    } else if (user.assignedFacilities && user.assignedFacilities.length > 0 && !facilityId) {
      localStorage.setItem("swiftyard_facility_id", user.assignedFacilities[0]);
    }

    // Load carrier data if applicable
    if (user.carrierId) {
      const carrierResponse = await api.carriers.getById(user.carrierId);
      if (carrierResponse.success && carrierResponse.data) {
        setCurrentCarrier(carrierResponse.data as Carrier);
      }
    }
  };

  const signup = async (
    email: string,
    pass: string,
    facilityId: string,
    role: string = "user",
    carrierId?: string,
    displayName?: string,
  ) => {
    const response = await api.auth.signup({
      email,
      password: pass,
      displayName: displayName || email.split("@")[0],
      facilityId,
      role,
      carrierId,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Signup failed");
    }

    const { user } = response.data;

    setCurrentUser(createAuthUser(user.uid, user.email, user.displayName, ""));
    setUserProfile(user as UserProfileData);

    // Set facility ID in localStorage for API calls
    if (user.assignedFacilities && user.assignedFacilities.length > 0) {
      localStorage.setItem("swiftyard_facility_id", user.assignedFacilities[0]);
    }

    if (user.carrierId) {
      const carrierResponse = await api.carriers.getById(user.carrierId);
      if (carrierResponse.success && carrierResponse.data) {
        setCurrentCarrier(carrierResponse.data as Carrier);
      }
    }
  };

  const clerkLogin = async (
    token: string,
    mode: "staff" | "carrier" = "staff",
    facilityId?: string,
  ) => {
    let fid = facilityId || localStorage.getItem("swiftyard_facility_id");
    if (fid && fid === 'null') fid = undefined;
    if (fid) {
      localStorage.setItem("swiftyard_facility_id", fid);
    }

    const response = await api.auth.clerkLogin(token, mode, fid);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Clerk login failed");
    }

    const { user } = response.data;
    setCurrentUser(createAuthUser(user.uid, user.email, user.displayName, ""));
    setUserProfile(user as UserProfileData);

    if (user.facilityId) {
      localStorage.setItem("swiftyard_facility_id", user.facilityId);
    } else if (user.assignedFacilities && user.assignedFacilities.length > 0 && !facilityId) {
      localStorage.setItem("swiftyard_facility_id", user.assignedFacilities[0]);
    }

    if (user.carrierId) {
      const carrierResponse = await api.carriers.getById(user.carrierId);
      if (carrierResponse.success && carrierResponse.data) {
        setCurrentCarrier(carrierResponse.data as Carrier);
      }
    }
  };

  const clerkSignup = async (
    token: string,
    facilityId: string,
    role: string = "user",
    carrierId?: string,
    firstName?: string,
    lastName?: string,
    username?: string
  ) => {
    const response = await api.auth.clerkSignup(token, facilityId, role, carrierId, firstName, lastName, username);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Clerk signup failed");
    }

    const { user } = response.data;
    setCurrentUser(createAuthUser(user.uid, user.email, user.displayName, ""));
    setUserProfile(user as UserProfileData);

    if (user.assignedFacilities && user.assignedFacilities.length > 0) {
      localStorage.setItem("swiftyard_facility_id", user.assignedFacilities[0]);
    }

    if (user.carrierId) {
      const carrierResponse = await api.carriers.getById(user.carrierId);
      if (carrierResponse.success && carrierResponse.data) {
        setCurrentCarrier(carrierResponse.data as Carrier);
      }
    }
  };

  const signOut = async () => {
    try {
      await clerk.signOut();
    } catch (err) {
      console.error("Clerk signout failed", err);
    }
    api.auth.logout();
    localStorage.removeItem("swiftyard_driver");
    localStorage.removeItem("swiftyard_driver_trailer");
    localStorage.removeItem("swiftyard_current_facility_id");
    // Clear all theme preferences on logout to ensure login page is always dark
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('swiftyard_theme_')) {
        localStorage.removeItem(key);
      }
    });
    setCurrentDriver(null);
    setCurrentUser(null);
    setUserProfile(null);
    setCurrentCarrier(null);
    return Promise.resolve();
  };

  const driverLogin = async (trailerNumber: string): Promise<Driver[]> => {
    const response = await api.driverLogin.findByTrailer(trailerNumber);

    if (!response.success) {
      throw new Error(response.error?.message || "Trailer not found");
    }

    const list = response.data?.drivers || [];
    const trailer = response.data?.trailer;
    console.log("[AuthContext] Driver login result:", list);
    console.log("[AuthContext] Trailer data:", trailer);

    if (list.length === 1) {
      const driverWithTrailer = {
        ...list[0],
        currentTrailer: trailer,
      };
      setCurrentDriver(driverWithTrailer);
      localStorage.setItem(
        "swiftyard_driver",
        JSON.stringify(driverWithTrailer),
      );
      if (trailer) {
        localStorage.setItem(
          "swiftyard_driver_trailer",
          JSON.stringify(trailer),
        );
      }
      console.log("[AuthContext] Driver logged in:", driverWithTrailer);
    }
    return list;
  };

  const selectDriver = (driver: Driver) => {
    setCurrentDriver(driver);
    localStorage.setItem("swiftyard_driver", JSON.stringify(driver));
  };

  const updateUserProfile = async (data: Partial<UserProfileData>) => {
    if (!currentUser || !userProfile) throw new Error("No user logged in");

    const response = await api.auth.updateProfile(data);
    if (!response.success) {
      throw new Error(response.error?.message || "Failed to update profile");
    }

    const newProfile = {
      ...userProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(
      createAuthUser(
        currentUser.uid,
        data.email || currentUser.email,
        data.displayName || currentUser.displayName,
        data.photoURL || currentUser.photoURL,
      ),
    );
    setUserProfile(newProfile);
  };

  const isAdmin = userProfile?.role === "admin";
  const isCarrier =
    userProfile?.role === "carrier" ||
    (userProfile?.role || "").toLowerCase().includes("carrier") ||
    !!userProfile?.carrierId;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#121212]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-slate-500 dark:text-gray-400 font-bold">
            Initializing System...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentDriver,
        currentCarrier,
        loading,
        login,
        signup,
        clerkLogin,
        clerkSignup,
        signOut,
        driverLogin,
        selectDriver,
        updateUserProfile,
        isAdmin,
        isCarrier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
