import React, { useState, useMemo, useRef, lazy, Suspense, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Toaster } from "./ui/Toaster";
import { LoadingIndicator } from "./ui/LoadingIndicator";
import { UserProfile } from "./UserProfile";
import {
    Shield,
    Building,
    RefreshCw,
    ChevronDown,
    Loader2,
} from "lucide-react";

// Lazy load pages inside AuthenticatedApp to ensure isolation
const Dashboard = lazy(() => import("../pages/Dashboard").then(m => ({ default: m.Dashboard })));
const PublicDriverBoard = lazy(() => import("../pages/PublicDriverBoard").then(m => ({ default: m.PublicDriverBoard })));
const Schedule = lazy(() => import("../pages/Schedule").then(m => ({ default: m.Schedule })));
const Gatehouse = lazy(() => import("../pages/Gatehouse").then(m => ({ default: m.Gatehouse })));
const Resources = lazy(() => import("../pages/Resources").then(m => ({ default: m.Resources })));
const Drivers = lazy(() => import("../pages/Drivers").then(m => ({ default: m.Drivers })));
const Settings = lazy(() => import("../pages/Settings").then(m => ({ default: m.Settings })));
const TrailerTypes = lazy(() => import("../pages/TrailerTypes").then(m => ({ default: m.TrailerTypes })));
const CalendarView = lazy(() => import("../pages/CalendarView").then(m => ({ default: m.CalendarView })));
const Trailers = lazy(() => import("../pages/Trailers").then(m => ({ default: m.Trailers })));
const Carriers = lazy(() => import("../pages/Carriers").then(m => ({ default: m.Carriers })));
const GuardGate = lazy(() => import("../pages/GuardGate").then(m => ({ default: m.GuardGate })));
const AdminUsers = lazy(() => import("../pages/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminRoles = lazy(() => import("../pages/AdminRoles").then(m => ({ default: m.AdminRoles })));
const AdminFacilities = lazy(() => import("../pages/AdminFacilities").then(m => ({ default: m.AdminFacilities })));
const HelpDocs = lazy(() => import("../pages/HelpDocs").then(m => ({ default: m.HelpDocs })));

// High-level role-based apps
const DriverView = lazy(() => import("../pages/DriverView").then(m => ({ default: m.DriverView })));
const CarrierPortal = lazy(() => import("../pages/CarrierPortal").then(m => ({ default: m.CarrierPortal })));

/**
 * YardStaffApp: The main application for staff and admins
 */
const YardStaffApp = () => {
    const { isAdmin } = useAuth();
    const {
        currentFacilityId,
        setCurrentFacilityId,
        refreshData,
        facilities,
        actionLoading,
        actionLoadingMessage,
        allowedFacilities
    } = useData();

    const [currentView, setCurrentView] = useState("dashboard");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFacilityMenuOpen, setIsFacilityMenuOpen] = useState(false);
    const [hasRedirectedToAdmin, setHasRedirectedToAdmin] = useState(false);
    const facilityMenuRef = useRef<HTMLDivElement>(null);

    // Set initial view based on role
    useEffect(() => {
        if (isAdmin && !hasRedirectedToAdmin) {
            setCurrentFacilityId(null);
            setCurrentView("admin-users");
            setHasRedirectedToAdmin(true);
        }
    }, [isAdmin, hasRedirectedToAdmin, setCurrentFacilityId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleFacilitySwitch = (facId: string | null) => {
        setCurrentFacilityId(facId);
        setIsFacilityMenuOpen(false);
        if (facId) {
            setCurrentView("dashboard");
        } else {
            setCurrentView("admin-users");
        }
    };

    const currentFacilityDisplay = useMemo(() => {
        if (isAdmin && !currentFacilityId)
            return { name: "Admin Console", type: "admin" };
        const fac = facilities.find((f) => f.id === currentFacilityId);
        return { name: fac?.name || "Unknown Facility", type: "facility" };
    }, [isAdmin, currentFacilityId, facilities]);

    const renderView = () => {
        switch (currentView) {
            case "admin-users":
                return <AdminUsers />;
            case "admin-roles":
                return <AdminRoles />;
            case "admin-facilities":
                return <AdminFacilities />;
            case "dashboard":
                return <Dashboard onNavigate={setCurrentView} />;
            case "driver-board":
                return <PublicDriverBoard />;
            case "guard-gate":
                return <GuardGate />;
            case "calendar":
                return <CalendarView />;
            case "schedule":
                return <Schedule />;
            case "gatehouse":
                return <Gatehouse />;
            case "resources":
                return <Resources />;
            case "carriers":
                return <Carriers />;
            case "trailers":
                return <Trailers />;
            case "trailer-types":
                return <TrailerTypes />;
            case "drivers":
                return <Drivers />;
            case "settings":
                return <Settings />;
            case "help":
                return <HelpDocs />;
            default:
                return isAdmin && !currentFacilityId ? (
                    <AdminUsers />
                ) : (
                    <Dashboard onNavigate={setCurrentView} />
                );
        }
    };

    return (
        <>
            <Toaster />
            {actionLoading && <LoadingIndicator message={actionLoadingMessage} fullScreen overlay />}
            <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-white">
                <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
                <main className="flex-1 ml-20 lg:ml-64 h-full bg-gradient-to-br from-slate-50 to-slate-200 dark:from-[#121212] dark:to-[#0f172a] relative flex flex-col">
                    {currentView !== "driver-board" && (
                        <div className="w-full flex justify-between items-center px-8 pt-6 pb-2 z-40 shrink-0 pointer-events-none print:hidden">
                            <div
                                className="relative pointer-events-auto"
                                ref={facilityMenuRef}
                            >
                                <button
                                    onClick={() => setIsFacilityMenuOpen(!isFacilityMenuOpen)}
                                    className="flex items-center gap-4 bg-white/60 dark:bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 shadow-sm transition-all group"
                                >
                                    <div
                                        className={`p-2 rounded-xl transition-colors ${currentFacilityDisplay.type === "admin" ? "bg-purple-500/20 text-purple-600" : "bg-blue-500/20 text-blue-600"}`}
                                    >
                                        {currentFacilityDisplay.type === "admin" ? (
                                            <Shield className="w-5 h-5" />
                                        ) : (
                                            <Building className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                            {currentFacilityDisplay.type === "admin"
                                                ? "System Context"
                                                : "Facility"}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                                                {currentFacilityDisplay.name}
                                            </h2>
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>
                                </button>
                                {isFacilityMenuOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1e1e1e] border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                        <div className="p-2 max-h-[300px] overflow-y-auto space-y-1">
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleFacilitySwitch(null)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${!currentFacilityId ? "bg-purple-500/10 text-purple-700" : "text-slate-600 dark:text-gray-300"}`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${!currentFacilityId ? "bg-purple-500 text-white" : "bg-slate-200"}`}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <p className="text-sm font-bold">Admin Console</p>
                                                    </div>
                                                </button>
                                            )}
                                            {allowedFacilities.map((f) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => handleFacilitySwitch(f.id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${currentFacilityId === f.id ? "bg-blue-500/10 text-blue-700" : "text-slate-600 dark:text-gray-300"}`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentFacilityId === f.id ? "bg-blue-500 text-white" : "bg-slate-200"}`}
                                                    >
                                                        <Building className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <p className="text-sm font-bold truncate">
                                                            {f.name}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="pointer-events-auto flex items-center gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-2.5 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-200 transition-all"
                                >
                                    <RefreshCw
                                        className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                                    />
                                </button>
                                <UserProfile />
                            </div>
                        </div>
                    )}
                    <div
                        className={`relative z-10 flex-1 overflow-y-auto ${currentView === "driver-board" ? "bg-[#0f172a]" : ""}`}
                    >
                        <Suspense fallback={
                            <div className="h-full w-full flex flex-col items-center justify-center p-12">
                                <Loader2 className="w-12 h-12 text-[#0a84ff] animate-spin mb-4" />
                                <p className="text-slate-500 dark:text-gray-400 font-medium">
                                    Loading {currentView.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}...
                                </p>
                            </div>
                        }>
                            {renderView()}
                        </Suspense>
                    </div>
                </main>
            </div>
        </>
    );
};

export const AuthenticatedApp: React.FC = () => {
    const { currentDriver, isCarrier } = useAuth();

    if (currentDriver) return (
        <Suspense fallback={<LoadingIndicator fullScreen message="Loading Driver App..." />}>
            <DriverView />
        </Suspense>
    );

    if (isCarrier) return (
        <Suspense fallback={<LoadingIndicator fullScreen message="Loading Carrier Portal..." />}>
            <CarrierPortal />
        </Suspense>
    );

    return <YardStaffApp />;
};

