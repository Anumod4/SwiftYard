
export type ResourceType = 'Dock' | 'YardSlot';
export type ResourceStatus = 'Available' | 'Occupied' | 'Unavailable';
// Updated Statuses
export type AppointmentStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Scheduled' | 'MovingToDock' | 'ReadyForCheckIn' | 'CheckedIn' | 'ReadyForCheckOut' | 'Completed' | 'Cancelled' | 'Departing' | 'GatedIn' | 'InYard' | 'Departed';
export type TrailerStatus = 'Scheduled' | 'GatedIn' | 'MovingToDock' | 'ReadyForCheckIn' | 'CheckedIn' | 'ReadyForCheckOut' | 'CheckedOut' | 'MovingToYard' | 'InYard' | 'GatedOut' | 'Unknown' | 'Cancelled';
export type UserRole = 'admin' | 'user' | 'gatekeeper' | 'carrier' | string;

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[]; // List of View IDs enabled (Visibility)
  accessLevels?: Record<string, 'view' | 'edit'>; // Granular control: 'view' = Read Only, 'edit' = Full Access
}

export interface Facility {
  id: string;
  name: string;
  address?: string;
  code?: string;
}

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  assignedFacilities: string[];
  facilityId?: string; // Current session facility
  carrierId?: string; // Links to Carrier table if role is 'carrier'
}

export interface UnavailabilityPeriod {
  id: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface Resource {
  id: string;
  facilityId: string;
  name: string;
  type: ResourceType;
  allowedTrailerTypes: string[];
  allowedCarrierIds: string[];
  status: ResourceStatus;
  operationMode?: 'Inbound' | 'Outbound' | 'Both';
  currentAppId?: string;
  currentTrailerId?: string;
  unavailability?: UnavailabilityPeriod[];
  capacity?: number;
}

export interface TrailerTypeDefinition {
  id: string;
  facilityId: string;
  name: string;
  defaultDuration: number;
  processTimePerPallet?: number;
}

export interface Driver {
  id: string;
  facilityId?: string;
  name: string;
  licenseNumber: string;
  phone: string;
  carrierId?: string;
  status: 'Away' | 'On Site';
}

export interface TrailerHistory {
  status: TrailerStatus;
  timestamp: string;
  location?: string;
  photos?: string[];
  documents?: string[];
}

export interface Trailer {
  id: string;
  facilityId: string;
  number: string;
  type: string;
  owner: string;
  carrierId?: string;
  currentDriverId?: string;
  currentAppointmentId?: string;
  status: TrailerStatus;
  location?: string;
  targetResourceId?: string;
  history: TrailerHistory[];
  ewayBillNumber?: string;
  ewayBillExpiry?: string;
  checkInWeight?: number;
  checkOutWeight?: number;
  checkOutDocNumber?: string;
  photos?: string[];
  documents?: string[];
  instructionTimestamp?: string;
}

export interface Carrier {
  id: string;
  facilityId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  billingOverrides?: {
    freeYardHours?: number;
    freeDockHours?: number;
    yardRatePerDay?: number;
    dockRatePerHour?: number;
  };
  bufferTimeMinutes?: number;
}

export interface Appointment {
  id: string;
  facilityId: string;
  trailerNumber?: string;
  trailerType?: string;
  isBobtail: boolean;
  driverName: string;
  carrierId?: string;
  poNumber?: string;
  asnNumber?: string;
  palletCount?: number;
  loadStatus?: 'Empty' | 'Loaded';
  startTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  assignedResourceId?: string;
  history: { status: AppointmentStatus; timestamp: string }[];
  // Carrier Specifics
  loadType?: 'Inbound' | 'Outbound';
  appointmentType?: 'Live' | 'Drop';
  rejectionReason?: string;
  // Driver App Fields
  acknowledgementStatus?: 'Pending' | 'Confirmed' | 'Rejected';
  acknowledgementTime?: string;
  instructionTimestamp?: string;
}

export interface DashboardMetrics {
  pendingAppointments: number;
  occupiedDocks: number;
  trailersInYard: number;
  dockOccupancyRate: number;
  avgGateToDock: number;
  avgDockDwell: number;
  avgYardDwell: number;
  longStayTrailers: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface WhatsAppRecipient {
  id: string;
  name: string;
  designation: string;
  number: string;
}

export interface AppSettings {
  yardName: string;
  language: 'en' | 'hi';
  enableNotifications: boolean;
  enableWhatsAppAlerts?: boolean;
  enableInstructionTimers?: boolean;
  showCountdownTimer?: boolean;
  enableAiSchedule?: boolean;
  gateInFlow?: 'YardDefault' | 'DockDirect';
  defaultYardSlotId?: string;
  whatsappConfig?: {
    phoneNumberId: string;
    accessToken: string;
  };
  workingHours: Record<string, Shift[]>;
  googleDrive?: {
    clientId: string;
    connected: boolean;
    fileId?: string;
    lastSync?: string;
  };
  dwellThresholds?: {
    yard: number;
    dock: number;
  };
  metricsRange?: {
    start: string;
    end: string;
  };
  statsResetDate?: string;
  instructionDurations?: {
    moveToDock: number;
    moveToYard: number;
    checkOut: number;
  };
  adminWhatsappRecipients?: WhatsAppRecipient[];
  adminWhatsappNumbers?: string[];
  defaultBillingRules?: {
    freeYardHours: number;
    freeDockHours: number;
    yardRatePerDay: number;
    dockRatePerHour: number;
  };
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  duration?: number;
}
