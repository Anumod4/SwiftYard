<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SwiftYard - Carrier Yard Driver & Yard Management System

A comprehensive yard management system with full API support for enterprise integration.

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)
[![Turso](https://img.shields.io/badge/Turso-libSQL-orange.svg)](https://turso.tech/)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [API Integration](#-api-integration)
- [Documentation](#-documentation)
- [Deployment](#-deployment)

---

## ✨ Features

### Core Yard Management

- **Appointment Scheduling** - Schedule and manage trailer appointments
- **Dock Management** - Assign and track dock doors
- **Yard Slot Management** - Manage yard slots and trailer placement
- **Trailer Tracking** - Complete trailer lifecycle tracking
- **Driver Management** - Driver registry and assignment
- **Carrier Management** - Carrier company management
- **Guard Gate Operations** - Gate-in/gate-out processing
- **Real-time Dashboard** - Live yard overview and metrics

### Enterprise Features

- **Multi-Facility Support** - Manage multiple yard locations
- **Role-Based Access Control** - Granular permissions and roles
- **Carrier Portal** - Dedicated portal for carrier partners
- **Driver App View** - Mobile-friendly driver interface
- **WhatsApp Integration** - Automated notifications
- **Google Drive Integration** - Document management

### API-First Architecture

- **RESTful API** - Complete API for all operations
- **JWT Authentication** - Secure token-based auth
- **External Integration Ready** - ERP, CRM, TMS integration
- **Webhook Support** - Event-driven architecture ready

---

## 🏗️ Architecture

SwiftYard uses a modern client-server architecture:

```
┌─────────────────┐         HTTP/JSON         ┌─────────────────┐
│   React SPA     │ ◄──────────────────────►  │  Express API    │
│   (Frontend)    │                           │    (Backend)    │
└─────────────────┘                           └────────┬────────┘
                                                      │
                                                      │ libSQL
                                                      ▼
                                              ┌─────────────────┐
                                              │  Turso Database │
                                              │   (Cloud/Local) │
                                              └─────────────────┘
```

**See [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) for detailed architecture documentation.**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Turso account (for cloud database) or local SQLite

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd swiftyard-yard-driver

# Install dependencies
npm install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Update with your credentials
# - Turso database URL and token
# - JWT secret (change for production!)
# - Optional: API keys for integrations
```

### Run the Application

```bash
# Development mode (runs both frontend and backend)
npm run dev

# Frontend will be available at https://swiftyard.netlify.app (or http://localhost:3000 locally)
# Backend API at http://localhost:4000
```

### Default Login

- **Super Admin:** `superadmin@swiftyard.com` / `SuperSecretPassword123!`

---

## 🔌 API Integration

SwiftYard provides a complete REST API for integration with external systems.

### Quick API Example

```bash
# Get API token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@swiftyard.com",
    "password": "password"
  }'

# Create an appointment
curl -X POST http://localhost:4000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "trailerNumber": "TRL-001",
    "trailerType": "40 FT Container",
    "driverName": "John Doe",
    "startTime": "2024-01-15T10:00:00Z",
    "durationMinutes": 60
  }'
```

### Integration Use Cases

#### ERP Integration
- Create appointments from purchase orders
- Sync trailer data with inventory
- Update shipment status automatically

#### CRM Integration  
- Carrier status updates via webhooks
- Customer notifications for appointments
- Sync contact information

#### TMS (Transport Management System)
- Real-time trailer location updates
- Automated dock assignments
- Driver dispatch integration

**Complete API documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) | Architecture overview and setup guide |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete API endpoint reference |
| [README.md](./README.md) | This file - quick start guide |

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Run both frontend and backend
npm run dev:client   # Frontend only
npm run dev:server   # Backend only

# Production
npm run build        # Build frontend
npm run server       # Run backend server
npm run start        # Start production server

# Other
npm run preview      # Preview production build
```

### Project Structure

```
├── server/                 # Backend API server
│   ├── routes/            # API route handlers
│   ├── middleware/        # Auth, validation, error handling
│   ├── db.ts              # Database access layer
│   └── index.ts           # Server entry point
│
├── services/              # Frontend services
│   └── api.ts             # API client
│
├── contexts/              # React context providers
│   ├── AuthContext.tsx    # Authentication
│   └── DataContext.tsx    # Data management
│
├── components/            # React components
├── pages/                 # Page components
├── types.ts               # TypeScript types
└── turso.ts               # Database client
```

---

## 🚢 Deployment

### Backend Deployment

```bash
# Set production environment variables
export PORT=4000
export TURSO_DB_URL=libsql://your-db.turso.io
export TURSO_AUTH_TOKEN=your-token
export JWT_SECRET=strong-secret
export NODE_ENV=production

# Start server
npm run server
```

### Frontend Deployment

```bash
# Build for production
npm run build

# Deploy the 'dist' folder to your hosting
# (Vercel, Netlify, Cloudflare Pages, etc.)
```

### Environment Variables

See [.env.example](./.env.example) for all available configuration options.

---

## 🔐 Security

- JWT-based authentication with configurable expiration
- Role-based access control (RBAC)
- Facility-level data isolation
- Password hashing with bcrypt
- CORS configuration for production
- Input validation on all endpoints

**Important:** Change the default JWT secret and superadmin password in production!

---

## 📊 Database

SwiftYard uses **Turso** (libSQL) for the database:

- **Cloud Mode:** Connect to Turso cloud database
- **Local Mode:** Uses local SQLite file

### Database Tables

- `users` - User accounts
- `roles` - Role definitions
- `facilities` - Yard locations
- `appointments` - Appointment records
- `trailers` - Trailer inventory
- `resources` - Docks and yard slots
- `drivers` - Driver registry
- `carriers` - Carrier companies
- `trailer_types` - Equipment types
- `settings` - Configuration

---

## 🤝 External System Integration

### Example: ERP Integration

```javascript
// Create appointment from ERP system
async function syncAppointmentFromERP(orderData) {
  const token = await getSwiftYardToken();
  
  const response = await fetch('http://localhost:4000/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Facility-ID': 'FAC-001'
    },
    body: JSON.stringify({
      trailerNumber: orderData.trailerNumber,
      trailerType: orderData.trailerType,
      driverName: orderData.driverName,
      carrierId: orderData.carrierId,
      poNumber: orderData.poNumber,
      startTime: orderData.scheduledDelivery,
      durationMinutes: 60,
      loadType: 'Inbound'
    })
  });
  
  return await response.json();
}
```

### Webhook Example

```javascript
// Receive webhook from external system
app.post('/webhook/trailer-update', async (req, res) => {
  const { trailerId, status, location } = req.body;
  
  // Update SwiftYard
  await api.trailers.update(trailerId, { status, location });
  
  res.json({ success: true });
});
```

---

## 🐛 Troubleshooting

### Server won't start
- Verify Turso credentials in `.env.local`
- Check if port 4000 is available
- Run `npm install` to ensure all dependencies are installed

### API requests failing (401 Unauthorized)
- Ensure you're including the JWT token in the Authorization header
- Check if the token has expired
- Verify the user has appropriate permissions

### Database errors
- Confirm Turso database URL and token are correct
- Check network connectivity to Turso
- Review server logs for detailed error messages

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 🙏 Support

For questions, issues, or feature requests, please contact the development team.

**View in AI Studio:** https://ai.studio/apps/drive/1TlGG9A1lJ89oQvGAFt6bkIKomFeXIYhP

---

<div align="center">

**Built with ❤️ using React, Express, and Turso**

</div>
