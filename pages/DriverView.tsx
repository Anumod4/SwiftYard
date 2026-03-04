import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import {
  Truck,
  MapPin,
  Warehouse,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Navigation,
  Container,
  DoorOpen,
  Check,
  PlayCircle,
  Timer,
  RefreshCw,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { setFacilityContext } from "../services/api";
import { LoadingIndicator } from "../components/ui/LoadingIndicator";

export const DriverView: React.FC = () => {
  const { currentDriver, signOut } = useAuth();
  const {
    docks,
    yardSlots,
    facilities,
    trailers,
    allResources,
    updateTrailer,
    moveTrailerToYard,
    addToast,
    setCurrentFacilityId,
    settings,
    refreshData,
  } = useData();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState<any | null>(null);

  // Refresh data on mount and when driver changes
  useEffect(() => {
    if (currentDriver) {
      console.log("[DriverView] Driver logged in:", currentDriver);

      // Set facility context from driver's facilityId via DataContext
      if (currentDriver.facilityId) {
        console.log("[DriverView] Setting facility context via DataContext:", currentDriver.facilityId);
        setCurrentFacilityId(currentDriver.facilityId);
      }

      // Try to load trailer from localStorage first
      const storedTrailer = localStorage.getItem("swiftyard_driver_trailer");
      if (storedTrailer) {
        try {
          const trailer = JSON.parse(storedTrailer);
          console.log(
            "[DriverView] Loaded trailer from localStorage:",
            trailer,
          );
          setActiveTrailer(trailer);
        } catch (e) {
          console.error("Failed to parse stored trailer:", e);
        }
      }
    }
  }, [currentDriver, refreshData]);

  // Sync activeTrailer with live server data (picks up targetResourceId, status changes etc)
  useEffect(() => {
    if (!activeTrailer || !trailers.length) return;
    const serverTrailer = trailers.find(
      (t) => t.id === activeTrailer.id || t.number?.toLowerCase() === activeTrailer.number?.toLowerCase()
    );
    if (serverTrailer && (
      serverTrailer.status !== activeTrailer.status ||
      serverTrailer.location !== activeTrailer.location ||
      serverTrailer.targetResourceId !== activeTrailer.targetResourceId
    )) {
      console.log('[DriverView] Syncing activeTrailer from server:', serverTrailer);
      setActiveTrailer(serverTrailer);
      localStorage.setItem('swiftyard_driver_trailer', JSON.stringify(serverTrailer));
    }
  }, [trailers, activeTrailer]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // 2. Determine Assigned Resource (Target or Current) - Based on trailer only
  const assignedResource = useMemo(() => {
    if (!activeTrailer) return null;

    // Case A: Moving TO Dock — use targetResourceId as destination dock
    if (activeTrailer.status === "MovingToDock") {
      const targetId = activeTrailer.targetResourceId || activeTrailer.location;
      if (targetId) {
        const cleanId = targetId.trim();
        return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "Dock" };
      }
      return null;
    }

    // Case B: Moving TO Yard — use targetResourceId as destination slot
    if (activeTrailer.status === "MovingToYard") {
      const targetId = activeTrailer.targetResourceId;
      if (targetId) {
        const cleanId = targetId.trim();
        return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "YardSlot" };
      }
      return null;
    }

    // Case C: In Yard (Location is in trailer record)
    if (activeTrailer.status === "InYard" && activeTrailer.location) {
      const cleanId = activeTrailer.location.trim();
      return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "YardSlot" };
    }

    // Case D: At Dock — current location
    if (
      ["CheckedIn", "ReadyForCheckIn"].includes(activeTrailer.status) &&
      activeTrailer.location
    ) {
      const cleanId = activeTrailer.location.trim();
      return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "Dock" };
    }

    // Case E: ReadyForCheckOut (Departure)
    if (activeTrailer.status === "ReadyForCheckOut" && activeTrailer.location) {
      const cleanId = activeTrailer.location.trim();
      return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "Dock" };
    }

    // Fallback if targetResourceId is provided directly but missed by specific cases
    if (activeTrailer.targetResourceId) {
      const cleanId = activeTrailer.targetResourceId.trim();
      return allResources.find((r) => r.id === cleanId) || { id: cleanId, name: cleanId, type: "YardSlot" };
    }

    return null;
  }, [activeTrailer, allResources]);

  // Facility Info
  const driverFacility = useMemo(() => {
    if (!currentDriver?.facilityId) return null;
    return facilities.find((f) => f.id === currentDriver.facilityId);
  }, [currentDriver, facilities]);

  // --- ACTIONS ---

  const confirmArrivalAtDock = async () => {
    if (activeTrailer && activeTrailer.status === "MovingToDock") {
      try {
        // Move from MovingToDock -> ReadyForCheckIn
        // Pass the targetResourceId as the location
        const targetLocation = activeTrailer.targetResourceId || activeTrailer.location;
        await updateTrailer(activeTrailer.id, {
          status: "ReadyForCheckIn",
          location: targetLocation
        });
        addToast(
          "Arrival Confirmed",
          "You are at the dock. Wait for staff check-in.",
          "success",
        );
      } catch (err: any) {
        console.error('[DriverView] Arrival error:', err);
        addToast("Error", err.message || "Failed to confirm arrival", "error");
      }
    }
  };

  const confirmDepartureFromDock = async () => {
    if (activeTrailer && activeTrailer.status === "ReadyForCheckOut") {
      try {
        // Move from ReadyForCheckOut -> CheckedOut (Trailer)
        await updateTrailer(activeTrailer.id, {
          status: "CheckedOut",
          location: null, // Clear location as they have left the dock
          currentAppointmentId: null,
        });
        addToast(
          "Departure Confirmed",
          "Dock vacated. Proceed to Guard Gate or Yard.",
          "success",
        );
      } catch (err: any) {
        console.error('[DriverView] Departure error:', err);
        addToast("Error", err.message || "Failed to confirm departure", "error");
      }
    }
  };

  const confirmYardMove = async () => {
    console.log('[DriverView] confirmYardMove called', { activeTrailer });
    if (
      activeTrailer &&
      activeTrailer.status === "MovingToYard" &&
      activeTrailer.targetResourceId
    ) {
      console.log('[DriverView] Conditions met, calling moveTrailerToYard');
      try {
        // Move from MovingToYard -> InYard
        await moveTrailerToYard(
          activeTrailer.id,
          activeTrailer.targetResourceId,
          undefined,
        );
        // Clean up target and update location
        await updateTrailer(activeTrailer.id, {
          targetResourceId: null,
          location: activeTrailer.targetResourceId // Ensure location is set to the yard slot
        });
        addToast("Parked", "Location updated to Yard Slot.", "success");

        // Refresh local state
        const updatedTrailer = { ...activeTrailer, status: "InYard", location: activeTrailer.targetResourceId, targetResourceId: null };
        setActiveTrailer(updatedTrailer);
        localStorage.setItem("swiftyard_driver_trailer", JSON.stringify(updatedTrailer));
      } catch (err: any) {
        console.error('[DriverView] Error in confirmYardMove:', err);
        addToast("Error", err.message || "Failed to update location", "error");
      }
    } else {
      console.log('[DriverView] Conditions NOT met', {
        hasActiveTrailer: !!activeTrailer,
        status: activeTrailer?.status,
        targetResourceId: activeTrailer?.targetResourceId
      });
      addToast("Error", "Cannot confirm yard move. Trailer status or location missing.", "error");
    }
  };

  // --- TIMER HELPER ---
  const renderTimer = (timestamp?: string, durationMinutes: number = 15) => {
    // Check Master Setting
    if (settings.enableInstructionTimers === false) return null;

    if (!timestamp) return null;
    const start = new Date(timestamp).getTime();
    const end = start + durationMinutes * 60 * 1000;
    const remainingMs = end - currentTime.getTime();

    const isOverdue = remainingMs < 0;

    // Countdown only shows if explicitly enabled (opt-in); overdue always shows
    const showCountdown = settings.showCountdownTimer === true;

    // If NOT showing countdown AND NOT overdue, hide completely
    if (!showCountdown && !isOverdue) return null;

    const totalSeconds = Math.abs(Math.floor(remainingMs / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;

    const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

    return (
      <div
        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 mb-4 animate-in fade-in zoom-in-95 duration-300 ${isOverdue ? "bg-red-500/10 border-red-500/50 text-red-500 animate-pulse" : "bg-white/5 border-white/20 text-white"}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-4 h-4" />
          <span className="text-[10px] uppercase font-bold tracking-wider">
            {isOverdue ? "Overdue" : "Time Remaining"}
          </span>
        </div>
        <div className="text-3xl font-mono font-bold tracking-widest leading-none">
          {isOverdue ? `-${formatted}` : formatted}
        </div>
      </div>
    );
  };

  // Resolve Location Name helper
  const resolveResName = (id?: string | null) => {
    if (!id) return null;
    const cleanId = id.trim();
    return allResources.find((r) => r.id === cleanId)?.name || cleanId;
  };

  // --- VIEW STATE LOGIC (Priority Order) ---

  let viewState = "STANDBY";
  let title = "No Active Job";
  let subTitle =
    "No active trailer or appointment found. Please check with the guard house or wait for assignment.";
  let icon = <Truck className="w-12 h-12" />;
  let colorClass = "text-gray-500 bg-gray-800";
  let timerElement: React.ReactNode = null;

  // Check if driver has any trailer assigned
  const hasAnyTrailer = activeTrailer !== null;

  // 1. Critical Movements (Instructions) - Based on trailer status only
  if (activeTrailer?.status === "ReadyForCheckOut") {
    viewState = "LEAVING_DOCK";
    title = "Move Out of Dock";
    subTitle = "Leave the dock immediately";
    icon = <DoorOpen className="w-14 h-14" />;
    colorClass = "text-orange-500 bg-orange-500/10";
    timerElement = renderTimer(
      activeTrailer.instructionTimestamp,
      settings.instructionDurations?.checkOut || 15,
    );
  } else if (activeTrailer?.status === "MovingToDock") {
    const targetName = resolveResName(activeTrailer.targetResourceId);
    viewState = "MOVING_TO_DOCK";
    title = "Move to Dock";
    subTitle = `Proceed to ${targetName || "assigned dock"}`;
    icon = <Warehouse className="w-14 h-14" />;
    colorClass = "text-blue-500 bg-blue-500/10";
    timerElement = renderTimer(
      activeTrailer.instructionTimestamp,
      settings.instructionDurations?.moveToDock || 15,
    );
  } else if (activeTrailer?.status === "MovingToYard") {
    const targetName = resolveResName(activeTrailer.targetResourceId);
    viewState = "MOVING_TO_YARD";
    title = "Move to Yard";
    subTitle = `Proceed to ${targetName || "yard slot"}`;
    icon = <Container className="w-14 h-14" />;
    colorClass = "text-indigo-500 bg-indigo-500/10";
    timerElement = renderTimer(
      activeTrailer.instructionTimestamp,
      settings.instructionDurations?.moveToYard || 15,
    );
  }
  // 2. Active Stationary States
  else if (activeTrailer?.status === "CheckedIn") {
    viewState = "AT_DOCK";
    title = "At Dock";
    subTitle = "Loading/Unloading in progress";
    icon = <PlayCircle className="w-14 h-14" />;
    colorClass = "text-blue-500 bg-blue-500/10";
  } else if (activeTrailer?.status === "ReadyForCheckIn") {
    viewState = "WAITING_CHECKIN";
    title = "Arrived at Dock";
    subTitle = "Wait for staff to check you in";
    icon = <Check className="w-14 h-14" />;
    colorClass = "text-emerald-500 bg-emerald-500/10";
  } else if (activeTrailer?.status === "InYard") {
    viewState = "IN_YARD";
    title = "In Yard";
    subTitle = "Parked and waiting";
    icon = <Container className="w-14 h-14" />;
    colorClass = "text-indigo-500 bg-indigo-500/10";
  }
  // 3. Entry/Exit States
  else if (activeTrailer?.status === "GatedIn") {
    viewState = "GATED_IN";
    title = "Gated In";
    subTitle = "Wait for dock or yard assignment";
    icon = <CheckCircle2 className="w-14 h-14" />;
    colorClass = "text-emerald-500 bg-emerald-500/10";
  } else if (activeTrailer?.status === "CheckedOut") {
    viewState = "READY_TO_EXIT";
    title = "Ready to Exit";
    subTitle = "Proceed to Guard Gate for checkout";
    icon = <LogOut className="w-14 h-14" />;
    colorClass = "text-gray-400 bg-gray-800";
  } else if (activeTrailer?.status === "GatedOut") {
    viewState = "DEPARTED";
    title = "Departed";
    subTitle = "You have left the facility";
  }

  if (!currentDriver) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans selection:bg-[#0a84ff] overflow-hidden">
      {isRefreshing && <LoadingIndicator fullScreen message="Updating Data..." />}
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-[#1e1e1e] safe-area-inset-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Logo className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white block leading-none">
              SwiftYard
            </span>
            <span className="text-[9px] uppercase font-black tracking-widest text-blue-500">
              Driver Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-none">
              {currentDriver.name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeTrailer ? activeTrailer.number : "No Trailer"}
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 text-white ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>

          <div className="w-9 h-9 rounded-full bg-[#0a84ff] flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            {currentDriver.name.charAt(0)}
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 bg-white/10 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-y-auto">
        <div className="bg-[#0a84ff]/10 border-b border-[#0a84ff]/20 py-2 px-4 flex items-center justify-center gap-2">
          <Warehouse className="w-4 h-4 text-[#0a84ff]" />
          <span className="text-sm font-bold text-[#0a84ff] tracking-wide uppercase">
            {driverFacility ? driverFacility.name : "Facility Access"}
          </span>
        </div>

        {/* STANDBY / NO JOB / GATED IN / IN YARD / AT DOCK */}
        {(viewState === "STANDBY" ||
          viewState === "GATED_IN" ||
          viewState === "IN_YARD" ||
          viewState === "AT_DOCK" ||
          viewState === "DEPARTED") && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${colorClass}`}
              >
                {icon}
              </div>

              <h2 className="text-3xl font-bold mb-2 text-white">{title}</h2>

              {activeTrailer && (
                <div className="bg-white/10 px-4 py-1 rounded-full font-mono text-sm mb-6">
                  {activeTrailer.number}
                </div>
              )}

              <p className="text-gray-400 max-w-xs mx-auto text-lg leading-relaxed mb-8">
                {subTitle}
              </p>

              {assignedResource && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                      Current Location
                    </p>
                    <p className="text-lg font-bold">{assignedResource.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* WAITING FOR STAFF ACTION - Added Location Display */}
        {viewState === "WAITING_CHECKIN" && (
          <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-500 justify-center items-center text-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 ring-4 ring-white/10 ${colorClass}`}
            >
              {icon}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{title}</h2>
            <p className="text-lg text-gray-400 mb-8">{subTitle}</p>

            {assignedResource && (
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl w-full max-w-sm mb-8 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                  Current Location
                </p>
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <span className="text-2xl font-bold">
                    {assignedResource.name}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl w-full max-w-sm">
              <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Staff Notified
              </p>
            </div>
          </div>
        )}

        {/* MOVEMENT INSTRUCTIONS (MovingToDock, MovingToYard, LeavingDock) */}
        {(viewState === "MOVING_TO_DOCK" ||
          viewState === "MOVING_TO_YARD" ||
          viewState === "LEAVING_DOCK") && (
            <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-bottom-10 duration-500 bg-white/5">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Timer */}
                {timerElement}

                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce ${colorClass}`}
                >
                  <Navigation className="w-14 h-14" />
                </div>

                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {title}
                </h2>

                {assignedResource && viewState !== "LEAVING_DOCK" ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 w-full mb-8 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-3 text-gray-400 mb-2">
                      {viewState === "MOVING_TO_DOCK" ? (
                        <Warehouse className="w-6 h-6" />
                      ) : (
                        <Container className="w-6 h-6" />
                      )}
                      <span className="font-bold text-lg uppercase">
                        {viewState === "MOVING_TO_DOCK"
                          ? "Destination Dock"
                          : "Destination Slot"}
                      </span>
                    </div>
                    <h1 className="text-5xl font-black text-white leading-tight tracking-tight break-words">
                      {assignedResource.name}
                    </h1>
                  </div>
                ) : viewState === "LEAVING_DOCK" ? (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-8 w-full mb-8">
                    <h1 className="text-4xl font-black text-orange-500 leading-tight">
                      Vacate Dock
                    </h1>
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    if (viewState === "MOVING_TO_DOCK") confirmArrivalAtDock();
                    else if (viewState === "MOVING_TO_YARD") confirmYardMove();
                    else if (viewState === "LEAVING_DOCK")
                      confirmDepartureFromDock();
                  }}
                  className={`w-full text-white font-black text-xl py-6 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3
                            ${viewState === "LEAVING_DOCK" ? "bg-orange-600 hover:bg-orange-500 shadow-orange-900/50" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50"}
                        `}
                >
                  {viewState === "LEAVING_DOCK" ? (
                    <LogOut className="w-8 h-8" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" />
                  )}
                  {viewState === "LEAVING_DOCK"
                    ? "I Have Departed"
                    : "I Have Arrived"}
                </button>

                <p className="text-xs text-gray-500 mt-6 max-w-xs">
                  {viewState === "LEAVING_DOCK"
                    ? "Confirm only after you have physically pulled away from the dock."
                    : "Confirm only when you have parked at the designated location."}
                </p>
              </div>
            </div>
          )}

        {viewState === "READY_TO_EXIT" && (
          <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-500 justify-center items-center text-center">
            <div className="w-32 h-32 bg-gray-700/50 rounded-full flex items-center justify-center mb-8 border-4 border-gray-600">
              <LogOut className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{title}</h2>
            <p className="text-lg text-gray-400">{subTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
};
