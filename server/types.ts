import { Request } from 'express';
import { UserProfileData, RoleDefinition } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    assignedFacilities: string[];
    carrierId?: string;
    facilityId?: string;
  };
  currentFacilityId?: string | null;
}

export interface JWTPayload {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  assignedFacilities: string[];
  carrierId?: string;
  facilityId?: string;
  iat?: number;
  exp?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface CreateAppointmentDTO {
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
  assignedResourceId?: string;
  loadType?: 'Inbound' | 'Outbound';
  appointmentType?: 'Live' | 'Drop';
}

export interface UpdateAppointmentDTO extends Partial<CreateAppointmentDTO> {
  status?: string;
  rejectionReason?: string;
  acknowledgementStatus?: 'Pending' | 'Confirmed' | 'Rejected';
}

export interface CreateTrailerDTO {
  number: string;
  type: string;
  owner: string;
  carrierId?: string;
  currentDriverId?: string;
  currentAppointmentId?: string;
  status?: string;
  location?: string;
  targetResourceId?: string;
  ewayBillNumber?: string;
  ewayBillExpiry?: string;
  checkInWeight?: number;
  checkOutWeight?: number;
  checkOutDocNumber?: string;
}

export interface UpdateTrailerDTO extends Partial<CreateTrailerDTO> {
  status?: string;
}

export interface CreateDriverDTO {
  name: string;
  licenseNumber: string;
  phone: string;
  carrierId?: string;
}

export interface UpdateDriverDTO extends Partial<CreateDriverDTO> { }

export interface CreateResourceDTO {
  name: string;
  type: 'Dock' | 'YardSlot';
  status?: string;
  operationMode?: 'Inbound' | 'Outbound' | 'Both';
  allowedTrailerTypes?: string[];
  allowedCarrierIds?: string[];
  capacity?: number;
}

export interface UpdateResourceDTO extends Partial<CreateResourceDTO> {
  status?: string;
  currentAppId?: string | null;
  currentTrailerId?: string | null;
  unavailability?: any[];
}

export interface CreateCarrierDTO {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  facilityIds?: string[];
  bufferTimeMinutes?: number;
}

export interface UpdateCarrierDTO extends Partial<CreateCarrierDTO> { }

export interface CreateTrailerTypeDTO {
  name: string;
  defaultDuration: number;
  processTimePerPallet?: number;
}

export interface UpdateTrailerTypeDTO extends Partial<CreateTrailerTypeDTO> { }

export interface CreateUserDTO {
  email: string;
  password: string;
  displayName: string;
  role: string;
  assignedFacilities: string[];
  carrierId?: string;
}

export interface UpdateUserDTO extends Partial<Omit<CreateUserDTO, 'password'>> {
  password?: string;
  photoURL?: string;
}

export interface CreateRoleDTO {
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: string[];
  accessLevels?: Record<string, 'view' | 'edit'>;
}

export interface UpdateRoleDTO extends Partial<CreateRoleDTO> { }

export interface CreateFacilityDTO {
  name: string;
  address?: string;
  code?: string;
}

export interface UpdateFacilityDTO extends Partial<CreateFacilityDTO> { }

export interface LoginDTO {
  identifier: string;
  password: string;
  mode?: 'staff' | 'carrier';
  facilityId?: string;
}

export interface SignupDTO {
  email: string;
  password: string;
  displayName: string;
  facilityId: string;
  role?: string;
  carrierId?: string;
}

export interface TokenResponse {
  token: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    assignedFacilities: string[];
    carrierId?: string;
  };
}
