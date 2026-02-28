# SwiftYard API Documentation

## Overview

SwiftYard is a comprehensive yard management system API that provides RESTful endpoints for managing appointments, trailers, resources, drivers, carriers, and facility operations.

**Base URL:** `http://localhost:4000/api`

## Authentication

All API endpoints (except `/api/auth/login` and `/api/auth/signup`) require authentication using JWT tokens.

### Obtaining a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "admin@swiftyard.com",
  "password": "password123",
  "mode": "staff"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "USR-123456",
      "email": "admin@swiftyard.com",
      "displayName": "Admin User",
      "role": "admin",
      "assignedFacilities": ["FAC-001"],
      "carrierId": null
    }
  }
}
```

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Optional: Facility Context

For multi-facility operations, you can specify the facility context:

```
X-Facility-ID: FAC-001
```

Or as a query parameter:

```
GET /api/appointments?facilityId=FAC-001
```

---

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Authenticate user and obtain JWT token.

**Body:**
```json
{
  "identifier": "email or username",
  "password": "password",
  "mode": "staff | carrier"
}
```

#### POST `/api/auth/signup`
Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "displayName": "User Name",
  "facilityId": "FAC-001",
  "role": "user",
  "carrierId": null
}
```

#### GET `/api/auth/me`
Get current user profile.

#### PUT `/api/auth/me`
Update current user profile.

**Body:**
```json
{
  "displayName": "New Name",
  "email": "newemail@example.com",
  "photoURL": "https://..."
}
```

#### POST `/api/auth/change-password`
Change user password.

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

### Appointments

#### GET `/api/appointments`
Get all appointments for the current facility.

**Query Parameters:**
- `facilityId` (optional): Filter by facility ID

#### GET `/api/appointments/:id`
Get appointment by ID.

#### POST `/api/appointments`
Create new appointment.

**Body:**
```json
{
  "trailerNumber": "TRL-001",
  "trailerType": "40 FT Container",
  "isBobtail": false,
  "driverName": "John Doe",
  "carrierId": "CAR-001",
  "poNumber": "PO-12345",
  "asnNumber": "ASN-67890",
  "palletCount": 20,
  "loadStatus": "Loaded",
  "startTime": "2024-01-15T10:00:00Z",
  "durationMinutes": 60,
  "assignedResourceId": "DOCK-01",
  "loadType": "Inbound",
  "appointmentType": "Live"
}
```

#### PUT `/api/appointments/:id`
Update appointment.

#### POST `/api/appointments/:id/cancel`
Cancel appointment.

#### POST `/api/appointments/:id/checkin`
Check-in appointment at dock.

**Body:**
```json
{
  "actualTime": "2024-01-15T09:45:00Z",
  "dockId": "DOCK-01"
}
```

#### POST `/api/appointments/:id/checkout`
Check-out appointment from dock.

**Body:**
```json
{
  "dockId": "DOCK-01"
}
```

#### DELETE `/api/appointments/:id`
Delete appointment.

---

### Trailers

#### GET `/api/trailers`
Get all trailers.

#### GET `/api/trailers/:id`
Get trailer by ID.

#### POST `/api/trailers`
Create new trailer.

**Body:**
```json
{
  "number": "TRL-001",
  "type": "40 FT Container",
  "owner": "Company Name",
  "carrierId": "CAR-001",
  "status": "Scheduled",
  "location": "Yard Slot 1",
  "ewayBillNumber": "EWB-123456",
  "ewayBillExpiry": "2024-01-20",
  "checkInWeight": 5000
}
```

#### PUT `/api/trailers/:id`
Update trailer.

#### POST `/api/trailers/:id/gateout`
Gate out trailer.

**Body:**
```json
{
  "checkOutWeight": 4800,
  "checkOutDocNumber": "DOC-123"
}
```

#### POST `/api/trailers/:id/move-to-yard`
Move trailer to yard slot.

**Body:**
```json
{
  "slotId": "SLOT-01",
  "appointmentId": "APT-123"
}
```

#### DELETE `/api/trailers/:id`
Delete trailer.

---

### Resources (Docks & Yard Slots)

#### GET `/api/resources`
Get all resources.

#### GET `/api/resources/:id`
Get resource by ID.

#### POST `/api/resources`
Create new resource.

**Body:**
```json
{
  "name": "Dock 1",
  "type": "Dock",
  "status": "Available",
  "operationMode": "Both",
  "allowedTrailerTypes": ["40 FT Container", "20 FT Container"],
  "allowedCarrierIds": [],
  "capacity": 1
}
```

#### PUT `/api/resources/:id`
Update resource.

#### POST `/api/resources/:id/clear`
Force clear resource (make available).

#### DELETE `/api/resources/:id`
Delete resource.

---

### Drivers

#### GET `/api/drivers`
Get all drivers.

#### GET `/api/drivers/:id`
Get driver by ID.

#### POST `/api/drivers`
Create new driver.

**Body:**
```json
{
  "name": "John Doe",
  "licenseNumber": "DL-123456",
  "phone": "+1234567890",
  "carrierId": "CAR-001"
}
```

#### PUT `/api/drivers/:id`
Update driver.

#### DELETE `/api/drivers/:id`
Delete driver.

---

### Carriers

#### GET `/api/carriers`
Get all carriers.

#### GET `/api/carriers/:id`
Get carrier by ID.

#### POST `/api/carriers`
Create new carrier.

**Body:**
```json
{
  "name": "Transport Company",
  "contactEmail": "contact@transport.com",
  "contactPhone": "+1234567890"
}
```

#### PUT `/api/carriers/:id`
Update carrier.

#### DELETE `/api/carriers/:id`
Delete carrier.

---

### Trailer Types

#### GET `/api/trailer-types`
Get all trailer types.

#### GET `/api/trailer-types/:id`
Get trailer type by ID.

#### POST `/api/trailer-types`
Create new trailer type.

**Body:**
```json
{
  "name": "40 FT Container",
  "defaultDuration": 60,
  "processTimePerPallet": 5
}
```

#### PUT `/api/trailer-types/:id`
Update trailer type.

#### DELETE `/api/trailer-types/:id`
Delete trailer type.

---

### Admin Endpoints (Admin Only)

#### Users

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:uid` - Get user by UID
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:uid` - Update user
- `DELETE /api/admin/users/:uid` - Delete user

#### Roles

- `GET /api/admin/roles` - Get all roles
- `GET /api/admin/roles/:id` - Get role by ID
- `POST /api/admin/roles` - Create role
- `PUT /api/admin/roles/:id` - Update role
- `DELETE /api/admin/roles/:id` - Delete role

#### Facilities

- `GET /api/admin/facilities` - Get all facilities
- `GET /api/admin/facilities/:id` - Get facility by ID
- `POST /api/admin/facilities` - Create facility
- `PUT /api/admin/facilities/:id` - Update facility
- `DELETE /api/admin/facilities/:id` - Delete facility

---

### Settings

#### GET `/api/settings`
Get current settings.

#### PUT `/api/settings`
Update settings.

**Body:**
```json
{
  "yardName": "SwiftYard",
  "language": "en",
  "theme": "dark",
  "enableNotifications": true,
  "workingHours": {
    "monday": [
      { "id": "1", "name": "Morning", "startTime": "08:00", "endTime": "16:00" }
    ]
  },
  "dwellThresholds": {
    "yard": 24,
    "dock": 4
  }
}
```

#### GET `/api/settings/all/list`
Get all settings records (admin only).

---

### Dashboard

#### GET `/api/dashboard/metrics`
Get dashboard metrics for current facility.

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingAppointments": 5,
    "occupiedDocks": 3,
    "trailersInYard": 8,
    "dockOccupancyRate": 37,
    "avgGateToDock": 15,
    "avgDockDwell": 45,
    "avgYardDwell": 0,
    "longStayTrailers": 0
  }
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently, there are no rate limits enforced. In production, consider implementing rate limiting middleware.

---

## Integration Examples

### External ERP Integration

```javascript
// Example: Create appointment from ERP system
async function createAppointmentFromERP(orderData) {
  const response = await fetch('http://localhost:4000/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      'X-Facility-ID': 'FAC-001'
    },
    body: JSON.stringify({
      trailerNumber: orderData.trailerNumber,
      trailerType: orderData.trailerType,
      isBobtail: false,
      driverName: orderData.driverName,
      carrierId: orderData.carrierId,
      poNumber: orderData.purchaseOrderNumber,
      startTime: orderData.scheduledTime,
      durationMinutes: 60,
      loadType: 'Inbound'
    })
  });
  
  return await response.json();
}
```

### CRM Webhook Integration

```javascript
// Example: Webhook handler for carrier status updates
app.post('/webhook/carrier-update', async (req, res) => {
  const { carrierId, status } = req.body;
  
  // Update carrier in SwiftYard
  await fetch(`http://localhost:4000/api/carriers/${carrierId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SWIFTYARD_TOKEN}`
    },
    body: JSON.stringify({ status })
  });
  
  res.json({ success: true });
});
```

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Implement rate limiting** for production use
4. **Validate all input** on the server side
5. **Use environment variables** for sensitive data
6. **Enable CORS** only for trusted domains
7. **Log all authentication attempts** for audit purposes

---

## Support

For API support and questions, contact the SwiftYard development team.
