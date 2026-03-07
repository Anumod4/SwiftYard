import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Appointment,
  Resource,
  Driver,
  Trailer,
  TrailerTypeDefinition,
  Carrier,
  AppSettings,
  DashboardMetrics,
  ToastMessage,
  UserProfileData,
  RoleDefinition,
  Facility,
} from "../types";
import { TRANSLATIONS } from "../constants";
import { useAuth } from "./AuthContext";
import * as XLSX from "xlsx";
import { api } from "../services/api";
import { useSocket } from "../hooks/useSocket";

// State structure for the reducer
interface DataState {
  rawResources: Resource[];
  rawAppointments: Appointment[];
  rawDrivers: Driver[];
  rawTrailers: Trailer[];
  rawCarriers: Carrier[];
  rawTrailerTypes: TrailerTypeDefinition[];
  rawUsers: UserProfileData[];
  rawRoles: RoleDefinition[];
  rawFacilities: Facility[];
  rawSettings: any[];
}

const initialState: DataState = {
  rawResources: [],
  rawAppointments: [],
  rawDrivers: [],
  rawTrailers: [],
  rawCarriers: [],
  rawTrailerTypes: [],
  rawUsers: [],
  rawRoles: [],
  rawFacilities: [],
  rawSettings: [],
};

type DataAction =
  | { type: 'SET_ALL_DATA'; payload: DataState }
  | { type: 'UPDATE_ENTITY'; entity: keyof DataState; data: any[] };

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_ALL_DATA':
      return action.payload;
    case 'UPDATE_ENTITY':
      return { ...state, [action.entity]: action.data };
    default:
      return state;
  }
}

interface DataContextType {
  appointments: Appointment[];
  allAppointments: Appointment[]; // Unfiltered for driver view
  trailers: Trailer[];
  allTrailers: Trailer[]; // Unfiltered for driver view
  drivers: Driver[];
  docks: Resource[];
  allDocks: Resource[];
  yardSlots: Resource[];
  allYardSlots: Resource[];
  allResources: Resource[];
  carriers: Carrier[];
  allCarriers: Carrier[]; // Unfiltered for admin/carrier linking
  trailerTypes: TrailerTypeDefinition[];
  settings: AppSettings;
  facilities: Facility[];
  roles: RoleDefinition[];
  allUsers: UserProfileData[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  metrics: DashboardMetrics;
  toasts: ToastMessage[];

  currentFacilityId: string | null;
  setCurrentFacilityId: (id: string | null) => void;
  allowedFacilities: Facility[];
  dataLoading: boolean;
  actionLoading: boolean;
  actionLoadingMessage: string;

  refreshData: () => Promise<void>;

  // Permissions Helper
  canEdit: (viewId: string) => boolean;

  // CRUD Actions
  addAppointment: (appt: Partial<Appointment>) => Promise<void>;
  updateAppointment: (
    id: string,
    updates: Partial<Appointment>,
  ) => Promise<void>;
  bulkUpdateAppointments: (
    updates: { id: string; updates: Partial<Appointment> }[]
  ) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  checkInAppointment: (
    id: string,
    actualTime: string,
    dockId?: string,
  ) => Promise<void>;
  checkOutAppointment: (id: string, dockId?: string) => Promise<void>;

  addTrailer: (trailer: Partial<Trailer>) => Promise<void>;
  updateTrailer: (id: string, updates: Partial<Trailer>) => Promise<void>;
  deleteTrailer: (id: string) => Promise<void>;
  gateOutTrailer: (
    id: string,
    checkOutWeight?: number,
    checkOutDocNumber?: string,
  ) => Promise<void>;
  moveTrailerToYard: (
    trailerId: string,
    slotId: string,
    apptId?: string,
  ) => void;

  addDriver: (driver: Partial<Driver>) => Promise<string>;
  updateDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;

  addResource: (res: Partial<Resource>) => Promise<void>;
  updateResource: (res: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  forceClearResource: (id: string) => Promise<void>;

  addCarrier: (carrier: Partial<Carrier>) => Promise<void>;
  updateCarrier: (carrier: Carrier) => Promise<void>;
  deleteCarrier: (id: string) => Promise<void>;

  addTrailerType: (type: Partial<TrailerTypeDefinition>) => Promise<void>;
  updateTrailerType: (
    id: string,
    updates: Partial<TrailerTypeDefinition>,
  ) => Promise<void>;
  deleteTrailerType: (id: string) => Promise<void>;

  addUser: (user: Partial<UserProfileData>) => Promise<void>;
  updateUser: (uid: string, updates: Partial<UserProfileData>) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;

  addRole: (role: Partial<RoleDefinition>) => Promise<void>;
  updateRole: (role: Partial<RoleDefinition>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  addFacility: (fac: Partial<Facility>) => Promise<void>;
  updateFacility: (fac: Facility) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;

  updateSettings: (newSettings: AppSettings) => Promise<void>;
  resetData: () => Promise<void>;
  resetEfficiencyStats: () => Promise<void>;
  performHousekeeping: () => Promise<void>;

  exportDatabase: () => void;
  importDatabase: (file: File) => Promise<void>;

  addToast: (
    title: string,
    message: string,
    type?: "success" | "error" | "info",
    duration?: number,
    actionLabel?: string,
    onAction?: () => void,
  ) => void;
  removeToast: (id: string) => void;

  t: (key: string) => string;
  formatDate: (dateStr: string) => string;
  formatDateTime: (dateStr: string) => string;
}

const DataStateContext = createContext<any>(undefined);
const DataActionsContext = createContext<any>(undefined);

// Combined context for backward compatibility
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userProfile, isAdmin, currentDriver } = useAuth();
  const token = api.auth.getToken();

  const [state, dispatch] = React.useReducer(dataReducer, initialState);

  const [settings, setSettings] = useState<AppSettings>({
    yardName: "SwiftYard",
    language: "en",
    enableNotifications: true,
    workingHours: {},
  });

  const [currentFacilityId, setCurrentFacilityId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('swiftyard_facility_id');
    }
    return null;
  });

  const { lastEvent } = useSocket(currentFacilityId || undefined, token || undefined);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingMessage, setActionLoadingMessage] = useState('');

  const [metricsTick, setMetricsTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMetricsTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // App-specific theme management (per user)
  const appType = useMemo(() => {
    if (typeof window === 'undefined') return 'yard';
    const path = window.location.pathname;
    if (path.includes('/carrier')) return 'carrier';
    if (isAdmin && !currentFacilityId) return 'admin';
    return 'yard';
  }, [isAdmin, currentFacilityId]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(`swiftyard_theme_${appType}_${userProfile?.uid || 'guest'}`);
    return (saved as 'light' | 'dark') || 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(`swiftyard_theme_${appType}_${userProfile?.uid || 'guest'}`, newTheme);
      }
      return newTheme;
    });
  }, [appType, userProfile?.uid]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`swiftyard_theme_${appType}_${userProfile?.uid || 'guest'}`);
      if (saved) setTheme(saved as 'light' | 'dark');
    }
  }, [appType, userProfile?.uid]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleSetCurrentFacilityId = useCallback((id: string | null) => {
    setCurrentFacilityId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('swiftyard_facility_id', id);
      } else {
        localStorage.removeItem('swiftyard_facility_id');
      }
    }
    api.setFacilityContext(id);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const hasAuth = !!userProfile || !!currentDriver;
      const isDriverOnly = !!currentDriver && !userProfile;

      const [
        resRes, resAppt, resDrv, resTrl, resCarr,
        resTypes, resSettings, resUsers, resRoles, resFacs,
      ] = await Promise.all([
        api.resources.getAll(),
        api.appointments.getAll(),
        hasAuth ? api.drivers.getAll() : Promise.resolve({ success: true, data: [] } as any),
        api.trailers.getAll(),
        api.carriers.getAll(),
        hasAuth ? api.trailerTypes.getAll() : Promise.resolve({ success: true, data: [] } as any),
        api.settings.getAll(),
        (!isDriverOnly && hasAuth) ? api.admin.getUsers() : Promise.resolve({ success: true, data: [] } as any),
        (!isDriverOnly && hasAuth) ? api.admin.getAllRoles() : Promise.resolve({ success: true, data: [] } as any),
        hasAuth ? api.facilities.getAll() : api.facilities.getPublic(),
      ]);

      dispatch({
        type: 'SET_ALL_DATA',
        payload: {
          rawResources: resRes.data || [],
          rawAppointments: resAppt.data || [],
          rawDrivers: resDrv.data || [],
          rawTrailers: resTrl.data || [],
          rawCarriers: resCarr.data || [],
          rawTrailerTypes: resTypes.data || [],
          rawUsers: resUsers.data || [],
          rawRoles: resRoles.data || [],
          rawFacilities: resFacs.data || [],
          rawSettings: resSettings.data || [],
        }
      });
    } catch (error) {
      console.error("[DataContext] Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [userProfile, currentDriver, currentFacilityId]);

  // Fetch data on mount and when user logs in/out
  useEffect(() => {
    const hasAuth = !!userProfile || !!currentDriver;
    console.log(
      "[DataContext] Auth state changed:",
      { user: userProfile?.email || "null", driver: currentDriver?.name || "null" }
    );

    // Auto-sync facility context from profile if not already set or if it differs
    const profileFacId = userProfile?.facilityId || currentDriver?.facilityId;
    if (profileFacId && profileFacId !== currentFacilityId) {
      console.log("[DataContext] Auto-syncing facility from profile:", profileFacId);
      handleSetCurrentFacilityId(profileFacId);
    }

    fetchData();
  }, [userProfile, currentDriver, currentFacilityId, fetchData, handleSetCurrentFacilityId]);

  // Handle real-time updates via Sockets
  useEffect(() => {
    if (lastEvent) {
      console.log("[DataContext] Socket event received:", lastEvent.event);
      // Refresh data for any relevant entity update
      const relevantEvents = [
        'trailer:',
        'appointment:',
        'resource:',
        'driver:',
        'carrier:',
        'user:'
      ];

      if (relevantEvents.some(prefix => lastEvent.event.startsWith(prefix))) {
        console.log("[DataContext] Refreshing data due to socket event:", lastEvent.event);
        fetchData();
      }
    }
  }, [lastEvent, fetchData]);

  // Determine effective settings based on current facility
  useEffect(() => {
    let effectiveSettings: AppSettings = {
      yardName: "SwiftYard",
      language: "en",
      enableNotifications: true,
      workingHours: {},
    };

    const globalSetting = state.rawSettings.find((s) => s.id === "global");
    if (globalSetting) {
      const gData =
        typeof globalSetting.data === "string"
          ? JSON.parse(globalSetting.data)
          : globalSetting.data;
      effectiveSettings = { ...effectiveSettings, ...gData };
    }

    if (currentFacilityId) {
      const facSetting = state.rawSettings.find((s) => s.id === currentFacilityId);
      if (facSetting) {
        const fData =
          typeof facSetting.data === "string"
            ? JSON.parse(facSetting.data)
            : facSetting.data;
        effectiveSettings = { ...effectiveSettings, ...fData };
      }
    }

    setSettings((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(effectiveSettings)) {
        return effectiveSettings;
      }
      return prev;
    });
  }, [currentFacilityId, state.rawSettings]);

  const facilities = useMemo(() => state.rawFacilities, [state.rawFacilities]);
  const allowedFacilities = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === "admin") return facilities;
    return facilities.filter((f) =>
      userProfile.assignedFacilities?.includes(f.id),
    );
  }, [userProfile, facilities]);

  useEffect(() => {
    // Auto-select first facility if none selected
    if (!currentFacilityId && allowedFacilities.length > 0) {
      if (userProfile?.role === "admin") {
        // Admins default to the Admin Console (null facilityId)
        return;
      }
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('swiftyard_facility_id') : null;
      const isValidStored = storedId && allowedFacilities.some(f => f.id === storedId);
      if (isValidStored) {
        handleSetCurrentFacilityId(storedId);
      } else {
        handleSetCurrentFacilityId(allowedFacilities[0].id);
      }
    }
  }, [
    allowedFacilities,
    currentFacilityId,
    handleSetCurrentFacilityId,
    userProfile?.role,
  ]);

  const filterByFacility = useCallback(
    (items: any[]) => {
      const isCarrier = userProfile && (userProfile.role === "carrier" || !!userProfile.carrierId);
      // If no facility context, return everything for admins and carriers (need for name resolution)
      if (!currentFacilityId) {
        return (isAdmin || isCarrier) ? items : [];
      }
      // Return items matching the current facility context
      return items.filter((i) => i.facilityId === currentFacilityId);
    },
    [currentFacilityId, isAdmin, userProfile],
  );

  const docks = useMemo(
    () => filterByFacility(state.rawResources).filter((r) => r.type === "Dock"),
    [state.rawResources, filterByFacility],
  );
  const allDocks = useMemo(
    () => state.rawResources.filter((r: any) => r.type === "Dock"),
    [state.rawResources],
  );
  const yardSlots = useMemo(
    () => filterByFacility(state.rawResources).filter((r) => r.type === "YardSlot"),
    [state.rawResources, filterByFacility],
  );
  const allYardSlots = useMemo(
    () => state.rawResources.filter((r: any) => r.type === "YardSlot"),
    [state.rawResources],
  );
  const allResources = useMemo(() => state.rawResources, [state.rawResources]);
  const appointments = useMemo(
    () => filterByFacility(state.rawAppointments),
    [state.rawAppointments, filterByFacility],
  );
  const trailers = useMemo(
    () => filterByFacility(state.rawTrailers),
    [state.rawTrailers, filterByFacility],
  );
  const drivers = useMemo(
    () => filterByFacility(state.rawDrivers),
    [state.rawDrivers, filterByFacility],
  );
  const carriers = useMemo(
    () => filterByFacility(state.rawCarriers),
    [state.rawCarriers, filterByFacility],
  );
  const trailerTypes = useMemo(
    () => filterByFacility(state.rawTrailerTypes),
    [state.rawTrailerTypes, filterByFacility],
  );
  const roles = useMemo(() => state.rawRoles, [state.rawRoles]);
  const allUsers = useMemo(() => state.rawUsers, [state.rawUsers]);

  const metrics = useMemo(() => {
    let statsAppointments = appointments;
    if (settings.metricsRange) {
      const start = new Date(settings.metricsRange.start).getTime();
      const end = new Date(settings.metricsRange.end).getTime() + 86400000;
      statsAppointments = appointments.filter((a) => {
        const t = new Date(a.startTime).getTime();
        return t >= start && t <= end;
      });
    }

    const pending = statsAppointments.filter(
      (a) => a.status === "Scheduled",
    ).length;
    const occupied = docks.filter((d) => d.status === "Occupied").length;
    const inYardCount = trailers.filter((t) =>
      !['Scheduled', 'GatedOut', 'Cancelled', 'Unknown'].includes(t.status)
    ).length;
    const rate =
      docks.length > 0 ? Math.round((occupied / docks.length) * 100) : 0;

    const now = new Date();

    let g2dSum = 0,
      g2dCount = 0,
      ddSum = 0,
      ddCount = 0;
    statsAppointments.forEach((a) => {
      const h = a.history || [];
      const gatedIn = h.find((x) => x.status === "GatedIn") || h.find(x => x.status !== 'Scheduled' && x.status !== 'Draft');
      const checkedIn = h.find((x) => x.status === "CheckedIn");
      const completed = h.find((x) => x.status === "Completed");

      if (gatedIn && checkedIn) {
        g2dSum +=
          (new Date(checkedIn.timestamp).getTime() -
            new Date(gatedIn.timestamp).getTime()) /
          60000;
        g2dCount++;
      } else if (gatedIn && !checkedIn && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Departed') {
        g2dSum += (now.getTime() - new Date(gatedIn.timestamp).getTime()) / 60000;
        g2dCount++;
      }

      if (checkedIn && completed) {
        ddSum +=
          (new Date(completed.timestamp).getTime() -
            new Date(checkedIn.timestamp).getTime()) /
          60000;
        ddCount++;
      } else if (checkedIn && !completed && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Departed') {
        ddSum += (now.getTime() - new Date(checkedIn.timestamp).getTime()) / 60000;
        ddCount++;
      }
    });

    let yardDwellSum = 0;
    let yardDwellCount = 0;
    const thresholdYard = settings.dwellThresholds?.yard || 4;
    const thresholdDock = settings.dwellThresholds?.dock || 2;

    // Calculate long stay trailers (currently in yard)
    const longStayCount = trailers.filter(t => {
      if (['Scheduled', 'GatedOut', 'Cancelled', 'Unknown'].includes(t.status)) return false;
      const history = t.history || [];
      const arrival = history.find(h => h.status !== 'Scheduled');
      if (arrival) {
        const totalHours = (now.getTime() - new Date(arrival.timestamp).getTime()) / (1000 * 60 * 60);
        if (totalHours > thresholdYard) return true;

        if (t.status === 'CheckedIn') {
          const lastCheckedIn = [...history].reverse().find(h => h.status === 'CheckedIn');
          if (lastCheckedIn) {
            const dockHours = (now.getTime() - new Date(lastCheckedIn.timestamp).getTime()) / (1000 * 60 * 60);
            if (dockHours > thresholdDock) return true;
          }
        }
      }
      return false;
    }).length;

    // Calculate Average Yard Dwell for currently active trailers ONLY
    trailers.forEach(t => {
      const h = t.history || [];
      // If it's not currently in the facility, skip it
      if (['Scheduled', 'GatedOut', 'Cancelled', 'Unknown'].includes(t.status)) {
        return;
      }

      // Find the first event that marks arrival (anything not Scheduled)
      const arrival = h.find(x => x.status !== 'Scheduled');

      if (arrival && arrival.timestamp) {
        const diff = (now.getTime() - new Date(arrival.timestamp).getTime()) / 60000;
        if (diff > 0) {
          yardDwellSum += diff;
          yardDwellCount++;
        }
      }
    });

    return {
      pendingAppointments: pending,
      occupiedDocks: occupied,
      trailersInYard: inYardCount,
      dockOccupancyRate: rate,
      avgGateToDock: g2dCount > 0 ? Math.round(g2dSum / g2dCount) : 0,
      avgDockDwell: ddCount > 0 ? Math.round(ddSum / ddCount) : 0,
      avgYardDwell: yardDwellCount > 0 ? Math.round(yardDwellSum / yardDwellCount) : 0,
      longStayTrailers: longStayCount,
    };
  }, [appointments, trailers, docks, settings.metricsRange, settings.dwellThresholds, metricsTick]);

  const addToast = useCallback(
    (
      title: string,
      message: string,
      type: "success" | "error" | "info" = "info",
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Permission Check Helper
  const canEdit = useCallback(
    (viewId: string): boolean => {
      if (!userProfile) return false;

      const role = state.rawRoles.find((r) => r.id === userProfile.role);

      // FAILSAFE: If 'admin' role definition is missing from DB (accidentally deleted), allow full access.
      // If it DOES exist, we enforce the configured permissions (so admin can restrict themselves for testing).
      if (!role && userProfile.role === "admin") return true;

      if (!role) return false; // Non-admin user with missing role -> deny

      // Must be permitted to view first
      if (!role.permissions.includes(viewId)) return false;

      // Check access level. Default to 'edit' if undefined for backward compatibility,
      // but strictly respect 'view' if explicitly set.
      const level = role.accessLevels?.[viewId];
      if (level === "view") return false;

      return true; // Default 'edit' or explicitly 'edit'
    },
    [userProfile, state.rawRoles],
  );

  // CRUD Implementations
  const refreshData = async () => fetchData();

  const addAppointment = async (appt: Partial<Appointment>) => {
    setActionLoading(true);
    setActionLoadingMessage('Creating appointment...');
    console.log('[DataContext] Creating appointment:', appt);
    const response = await api.appointments.create(appt);
    console.log('[DataContext] Create appointment response:', response);
    if (response.success) {
      await fetchData();
    } else {
      console.error('[DataContext] Create appointment failed:', response.error);
    }
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateAppointment = async (
    id: string,
    updates: Partial<Appointment>,
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating appointment...');
    console.log('[DataContext] Updating appointment:', id, updates);
    const response = await api.appointments.update(id, updates);
    console.log('[DataContext] Update appointment response:', response);
    if (response.success) {
      await fetchData();
    } else {
      console.error('[DataContext] Update appointment failed:', response.error);
    }
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const bulkUpdateAppointments = async (
    updates: { id: string; updates: Partial<Appointment> }[]
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Bulk updating appointments...');
    console.log('[DataContext] Bulk updating appointments:', updates.length);
    const response = await api.appointments.bulkUpdate(updates);
    console.log('[DataContext] Bulk update appointment response:', response);
    if (response.success) {
      await fetchData();
    } else {
      console.error('[DataContext] Bulk update appointment failed:', response.error);
    }
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const cancelAppointment = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Cancelling appointment...');
    const response = await api.appointments.cancel(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteAppointment = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting appointment...');
    const response = await api.appointments.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const checkInAppointment = async (
    id: string,
    actualTime: string,
    dockId?: string,
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Checking in...');
    const response = await api.appointments.checkIn(id, actualTime, dockId);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const checkOutAppointment = async (id: string, dockId?: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Checking out...');
    const response = await api.appointments.checkOut(id, dockId);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addTrailer = async (trailer: Partial<Trailer>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding trailer...');
    console.log('[DataContext] Adding trailer:', trailer);
    const response = await api.trailers.create(trailer);
    console.log('[DataContext] Add trailer response:', response);
    if (response.success) {
      await fetchData();
    } else {
      console.error('[DataContext] Add trailer failed:', response.error);
    }
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateTrailer = async (id: string, updates: Partial<Trailer>) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating trailer...');
    try {
      const response = await api.trailers.update(id, updates);
      if (response.success) {
        await fetchData();
      } else {
        throw new Error(response.error?.message || 'Failed to update trailer');
      }
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const deleteTrailer = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting trailer...');
    const response = await api.trailers.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const gateOutTrailer = async (id: string, weight?: number, doc?: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Processing gate out...');
    const response = await api.trailers.gateOut(id, weight, doc);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const moveTrailerToYard = async (
    trailerId: string,
    slotId: string,
    apptId?: string,
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Moving trailer to yard...');
    try {
      const response = await api.trailers.moveToYard(trailerId, slotId, apptId);
      if (response.success) {
        await fetchData();
      } else {
        throw new Error(response.error?.message || 'Failed to move trailer');
      }
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const addDriver = async (driver: Partial<Driver>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding driver...');
    const response = await api.drivers.create(driver);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
    return response.data?.id || "";
  };

  const updateDriver = async (driver: Driver) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating driver...');
    const response = await api.drivers.update(driver.id, driver);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteDriver = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting driver...');
    const response = await api.drivers.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addResource = async (res: Partial<Resource>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding resource...');
    const response = await api.resources.create(res);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateResource = async (res: Partial<Resource>) => {
    if (!res.id) return;
    setActionLoading(true);
    setActionLoadingMessage('Updating resource...');
    try {
      const response = await api.resources.update(res.id, res);
      if (response.success) await fetchData();
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const deleteResource = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting resource...');
    const response = await api.resources.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const forceClearResource = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Clearing resource...');
    const response = await api.resources.clear(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addCarrier = async (carrier: Partial<Carrier>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding carrier...');
    const response = await api.carriers.create(carrier);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateCarrier = async (carrier: Carrier) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating carrier...');
    const response = await api.carriers.update(carrier.id, carrier);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteCarrier = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting carrier...');
    const response = await api.carriers.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addTrailerType = async (type: Partial<TrailerTypeDefinition>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding trailer type...');
    const response = await api.trailerTypes.create(type);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateTrailerType = async (
    id: string,
    updates: Partial<TrailerTypeDefinition>,
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating trailer type...');
    const response = await api.trailerTypes.update(id, updates);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteTrailerType = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting trailer type...');
    const response = await api.trailerTypes.delete(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addUser = async (
    user: Partial<UserProfileData> & { password?: string },
  ) => {
    setActionLoading(true);
    setActionLoadingMessage('Creating user...');
    try {
      const response = await api.admin.createUser(user as any);
      if (response.success) {
        await fetchData();
      } else {
        throw new Error(response.error?.message || 'Failed to create user');
      }
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const updateUser = async (uid: string, updates: Partial<UserProfileData>) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating user...');
    try {
      const response = await api.admin.updateUser(uid, updates);
      if (response.success) {
        await fetchData();
      } else {
        throw new Error(response.error?.message || 'Failed to update user');
      }
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const deleteUser = async (uid: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting user...');
    const response = await api.admin.deleteUser(uid);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addRole = async (role: Partial<RoleDefinition>) => {
    setActionLoading(true);
    setActionLoadingMessage('Creating role...');
    const response = await api.admin.createRole(role);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateRole = async (role: Partial<RoleDefinition>) => {
    if (!role.id) return;
    setActionLoading(true);
    setActionLoadingMessage('Updating role...');
    const response = await api.admin.updateRole(role.id, role);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteRole = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting role...');
    const response = await api.admin.deleteRole(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const addFacility = async (fac: Partial<Facility>) => {
    setActionLoading(true);
    setActionLoadingMessage('Adding facility...');
    const response = await api.admin.createFacility(fac);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateFacility = async (fac: Facility) => {
    setActionLoading(true);
    setActionLoadingMessage('Updating facility...');
    const response = await api.admin.updateFacility(fac.id, fac);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const deleteFacility = async (id: string) => {
    setActionLoading(true);
    setActionLoadingMessage('Deleting facility...');
    const response = await api.admin.deleteFacility(id);
    if (response.success) await fetchData();
    setActionLoading(false);
    setActionLoadingMessage('');
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setActionLoading(true);
    setActionLoadingMessage('Saving settings...');
    console.log('[Settings] Saving settings:', newSettings);
    try {
      const response = await api.settings.update(newSettings);
      console.log('[Settings] Save response:', response);
      if (response.success) {
        await fetchData();
        console.log('[Settings] Settings saved successfully');
        addToast('Settings Saved', 'Your changes have been saved.', 'success');
      } else {
        console.error('[Settings] Save failed:', response.error);
        addToast('Save Failed', response.error?.message || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      console.error('[Settings] Save error:', err);
      addToast('Save Error', err.message || 'Failed to save settings', 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingMessage('');
    }
  };

  const resetData = async () => {
    addToast("Reset", "Data reset initiated", "info");
  };

  const resetEfficiencyStats = async () => {
    await updateSettings({
      ...settings,
      statsResetDate: new Date().toISOString(),
    });
  };

  const performHousekeeping = useCallback(async () => {
    // Logic for auto-closing stale records
  }, []);

  const exportDatabase = () => {
    const wb = XLSX.utils.book_new();
    const tables = [
      { name: "Appointments", data: state.rawAppointments },
      { name: "Trailers", data: state.rawTrailers },
      { name: "Resources", data: state.rawResources },
      { name: "Drivers", data: state.rawDrivers },
      { name: "Carriers", data: state.rawCarriers },
    ];
    tables.forEach((t) => {
      const ws = XLSX.utils.json_to_sheet(
        t.data.map((item) => {
          const obj: any = { ...item };
          Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === "object")
              obj[key] = JSON.stringify(obj[key]);
          });
          return obj;
        }),
      );
      XLSX.utils.book_append_sheet(wb, ws, t.name);
    });
    XLSX.writeFile(
      wb,
      `SwiftYard_Backup_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const importDatabase = async (file: File) => {
    // Import XLSX implementation
  };

  const t = (key: string) => {
    const lang = settings.language || "en";
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];
    return (dict as any)[key] || key;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();
  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString();

  const stateValue = useMemo(() => ({
    appointments,
    allAppointments: state.rawAppointments,
    trailers,
    allTrailers: state.rawTrailers,
    drivers,
    docks,
    allDocks,
    yardSlots,
    allYardSlots,
    allResources,
    carriers,
    allCarriers: state.rawCarriers,
    trailerTypes,
    settings,
    theme,
    facilities,
    roles,
    allUsers,
    metrics,
    toasts,
    currentFacilityId,
    allowedFacilities,
    dataLoading,
    actionLoading,
    actionLoadingMessage,
  }), [
    appointments, state.rawAppointments, trailers, state.rawTrailers, drivers, docks, allDocks,
    yardSlots, allYardSlots, allResources, carriers, state.rawCarriers, trailerTypes, settings, theme, facilities,
    roles, allUsers, metrics, toasts, currentFacilityId, allowedFacilities,
    dataLoading, actionLoading, actionLoadingMessage
  ]);

  const actionsValue = useMemo(() => ({
    toggleTheme,
    setCurrentFacilityId: handleSetCurrentFacilityId,
    refreshData,
    canEdit,
    addAppointment,
    updateAppointment,
    bulkUpdateAppointments,
    cancelAppointment,
    deleteAppointment,
    checkInAppointment,
    checkOutAppointment,
    addTrailer,
    updateTrailer,
    deleteTrailer,
    gateOutTrailer,
    moveTrailerToYard,
    addDriver,
    updateDriver,
    deleteDriver,
    addResource,
    updateResource,
    deleteResource,
    forceClearResource,
    addCarrier,
    updateCarrier,
    deleteCarrier,
    addTrailerType,
    updateTrailerType,
    deleteTrailerType,
    addUser,
    updateUser,
    deleteUser,
    addRole,
    updateRole,
    deleteRole,
    addFacility,
    updateFacility,
    deleteFacility,
    updateSettings,
    resetData,
    resetEfficiencyStats,
    performHousekeeping,
    exportDatabase,
    importDatabase,
    addToast,
    removeToast,
    t,
    formatDate,
    formatDateTime,
  }), [
    toggleTheme, handleSetCurrentFacilityId, refreshData, canEdit, addAppointment,
    updateAppointment, bulkUpdateAppointments, cancelAppointment, deleteAppointment, checkInAppointment,
    checkOutAppointment, addTrailer, updateTrailer, deleteTrailer, gateOutTrailer,
    moveTrailerToYard, addDriver, updateDriver, deleteDriver, addResource,
    updateResource, deleteResource, forceClearResource, addCarrier, updateCarrier,
    deleteCarrier, addTrailerType, updateTrailerType, deleteTrailerType, addUser,
    updateUser, deleteUser, addRole, updateRole, deleteRole, addFacility,
    updateFacility, deleteFacility, updateSettings, performHousekeeping,
    exportDatabase, importDatabase, addToast, removeToast, t, formatDate, formatDateTime, resetData, resetEfficiencyStats
  ]);

  const combinedValue = useMemo(() => ({
    ...stateValue,
    ...actionsValue,
  }), [stateValue, actionsValue]);

  return (
    <DataStateContext.Provider value={stateValue}>
      <DataActionsContext.Provider value={actionsValue}>
        <DataContext.Provider value={combinedValue}>
          {children}
        </DataContext.Provider>
      </DataActionsContext.Provider>
    </DataStateContext.Provider>
  );
};

// Export useData hook
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
