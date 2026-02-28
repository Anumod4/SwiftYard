# SwiftYard API Architecture

## Overview

SwiftYard has been converted to a fully API-based architecture, enabling seamless integration with external systems like ERP, CRM, and other enterprise applications. The application now follows a client-server architecture with a RESTful API backend.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │ Components  │  │     Context Providers   │ │
│  │             │  │             │  │  (Auth, Data)           │ │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘ │
│                                                  │              │
│                                    ┌─────────────▼─────────────┐
│                                    │     API Client Layer      │
│                                    │   (services/api.ts)       │
│                                    └─────────────┬─────────────┘
└──────────────────────────────────────────────────┼──────────────┘
                                                   │ HTTP/JSON
                                                   │
┌──────────────────────────────────────────────────▼──────────────┐
│                      API SERVER (Express)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Middleware Layer                         ││
│  │  • Authentication (JWT)  • Authorization (RBAC)             ││
│  │  • Facility Context      • Error Handling                   ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      REST Routes                            ││
│  │  /api/auth       /api/appointments   /api/trailers          ││
│  │  /api/resources  /api/drivers        /api/carriers          ││
│  │  /api/trailer-types  /api/admin  /api/settings              ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Database Access Layer                     ││
│  │              (server/db.ts - Turso Client)                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                                   │
                                                   │ libSQL
                                                   │
┌──────────────────────────────────────────────────▼──────────────┐
│                    DATABASE (Turso/libSQL)                      │
│  Tables: users, roles, facilities, appointments, trailers,      │
│          resources, drivers, carriers, trailer_types, settings  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Backend API Server (`server/`)

A new Express.js server provides RESTful API endpoints:

- **`server/index.ts`** - Main server entry point
- **`server/db.ts`** - Database access layer with Turso
- **`server/middleware/auth.ts`** - Authentication & authorization
- **`server/routes/`** - API route handlers
  - `auth.ts` - Authentication endpoints
  - `appointments.ts` - Appointment management
  - `trailers.ts` - Trailer management
  - `resources.ts` - Dock and yard slot management
  - `drivers.ts` - Driver management
  - `carriers.ts` - Carrier management
  - `trailerTypes.ts` - Trailer type definitions
  - `admin.ts` - Admin operations (users, roles, facilities)
  - `settings.ts` - System settings

### 2. API Client Layer (`services/api.ts`)

A comprehensive API client provides:

- Token management
- Request/response handling
- Error handling
- Facility context management
- Type-safe API calls

### 3. Updated Context Providers

- **`contexts/AuthContext.tsx`** - Now uses API client for authentication
- **`contexts/DataContext.tsx`** - Now uses API client for all data operations

### 4. Development Proxy

Vite dev server proxies `/api` requests to the backend server (port 4000).

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Update with your values (especially Turso credentials)
```

### Running the Application

```bash
# Run both frontend and backend (recommended for development)
npm run dev

# Or run separately:
npm run dev:server  # Backend only (port 4000)
npm run dev:client  # Frontend only (port 3000)

# Production
npm run build       # Build frontend
npm run server      # Run backend server
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/signup` | Create new user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update user profile |
| POST | `/api/auth/change-password` | Change password |

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments |
| GET | `/api/appointments/:id` | Get appointment |
| POST | `/api/appointments` | Create appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| DELETE | `/api/appointments/:id` | Delete appointment |
| POST | `/api/appointments/:id/cancel` | Cancel appointment |
| POST | `/api/appointments/:id/checkin` | Check-in at dock |
| POST | `/api/appointments/:id/checkout` | Check-out from dock |

### Trailers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trailers` | List trailers |
| GET | `/api/trailers/:id` | Get trailer |
| POST | `/api/trailers` | Create trailer |
| PUT | `/api/trailers/:id` | Update trailer |
| DELETE | `/api/trailers/:id` | Delete trailer |
| POST | `/api/trailers/:id/gateout` | Gate out trailer |
| POST | `/api/trailers/:id/move-to-yard` | Move to yard |

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resources` | List resources |
| GET | `/api/resources/:id` | Get resource |
| POST | `/api/resources` | Create resource |
| PUT | `/api/resources/:id` | Update resource |
| DELETE | `/api/resources/:id` | Delete resource |
| POST | `/api/resources/:id/clear` | Force clear |

### Drivers, Carriers, Trailer Types

Similar CRUD endpoints for each entity.

### Admin (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:uid` | Update user |
| DELETE | `/api/admin/users/:uid` | Delete user |
| GET/POST/PUT/DELETE | `/api/admin/roles/*` | Role management |
| GET/POST/PUT/DELETE | `/api/admin/facilities/*` | Facility management |

### Settings & Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/dashboard/metrics` | Get dashboard metrics |

## External System Integration

### ERP Integration Example

```javascript
// Create appointment from ERP
const response = await fetch('http://localhost:4000/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'X-Facility-ID': 'FAC-001'
  },
  body: JSON.stringify({
    trailerNumber: 'TRL-001',
    trailerType: '40 FT Container',
    isBobtail: false,
    driverName: 'John Doe',
    startTime: '2024-01-15T10:00:00Z',
    durationMinutes: 60,
    loadType: 'Inbound'
  })
});

const result = await response.json();
```

### CRM Webhook Example

```javascript
// Webhook endpoint for carrier updates
app.post('/webhook/carrier-status', async (req, res) => {
  const { carrierId, status } = req.body;
  
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

## Authentication Flow

1. User logs in via `/api/auth/login`
2. Server validates credentials and returns JWT token
3. Client stores token in localStorage
4. All subsequent requests include token in `Authorization` header
5. Server middleware validates token and sets user context
6. Token expires after 7 days (configurable)

## Facility Context

For multi-facility deployments:

1. Admin users can switch between facilities
2. Facility ID is sent via `X-Facility-ID` header or query param
3. All data operations are scoped to the current facility
4. Non-admin users are restricted to their assigned facilities

## Security

- JWT-based authentication
- Role-based access control (RBAC)
- Facility-level data isolation
- Password hashing with bcrypt
- CORS configuration
- Input validation with Zod (can be added)

## Database Schema

The application uses Turso (libSQL) with the following tables:

- `users` - User accounts and profiles
- `roles` - Role definitions with permissions
- `facilities` - Facility locations
- `appointments` - Appointment records
- `trailers` - Trailer inventory
- `resources` - Docks and yard slots
- `drivers` - Driver registry
- `carriers` - Carrier companies
- `trailer_types` - Equipment type definitions
- `settings` - System configuration

## Deployment

### Backend

```bash
# Build (if using TypeScript compilation)
npm run build:server

# Start production server
npm run server
```

### Frontend

```bash
# Build for production
npm run build

# Serve built files
npm run preview
```

### Environment Variables for Production

```bash
PORT=4000
TURSO_DB_URL=libsql://your-production-db.turso.io
TURSO_AUTH_TOKEN=your-production-token
JWT_SECRET=strong-random-secret-change-this
CORS_ORIGINS=https://yourdomain.com
NODE_ENV=production
```

## API Documentation

Full API documentation are available in `API_DOCUMENTATION.md`.

## Troubleshooting

### Server won't start

- Check Turso credentials in `.env.local`
- Ensure port 4000 is not in use
- Run `npm install` to install dependencies

### API requests failing

- Verify token is being sent in Authorization header
- Check CORS configuration
- Ensure facility context is set for authenticated requests

### Database errors

- Verify Turso database URL and token
- Check network connectivity to Turso
- Review database schema initialization logs

## Future Enhancements

- [ ] Add OpenAPI/Swagger documentation
- [ ] Implement rate limiting
- [ ] Add request validation middleware
- [ ] Implement caching layer
- [ ] Add WebSocket support for real-time updates
- [ ] Implement audit logging
- [ ] Add GraphQL endpoint option
- [ ] Implement API versioning

## Support

For questions or issues, refer to the main README.md or contact the development team.
