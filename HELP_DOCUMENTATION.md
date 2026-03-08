# 🚛 SWIFTYARD SYSTEM HELP DOCUMENTATION

## Executive Summary

SwiftYard is a sophisticated **Yard Management System (YMS)** with three integrated applications serving distinct operational roles. This documentation provides comprehensive guidance for end-users and technical teams across functional workflows, system architecture, and UI/UX navigation.

**Documentation Prepared:** March 8, 2026  
**Repository:** [Anumod4/SwiftYard](https://github.com/Anumod4/SwiftYard)  
**Tech Stack:** TypeScript (84.2%), JavaScript (13.3%), React, Express.js, Turso (libSQL)

---

# PART 1: FUNCTIONAL MAPPING — "THE WHAT"

## 1.1 End-to-End Workflow: The Life of an Appointment

### Conceptual Journey

An appointment in SwiftYard represents a **contractual agreement** between a Carrier and the Yard Facility to occupy a resource (Dock or Yard Slot) at a scheduled time.

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1]           [2]            [3]           [4]    [5]    [6]  │
│ CREATED  →  SCHEDULED  →  GATE-IN  →  DOCKED  → YARD  → CLOSED
│                                                                 │
│  Carrier      Resource     Driver         Dock    Slot   Final │
│  App          Assignment   Arrives      Check-in  Move   Audit │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1: APPOINTMENT CREATION (Carrier App)

**Who:** Carrier Operations Team  
**When:** 1-7 days before arrival  
**System:** Carrier App → REST API

**Actions:**
1. Carrier logs into the **Carrier App** with multi-facility visibility
2. Initiates new appointment with:
   - **Trailer Details:** Number, Type (40 FT, 20 FT, etc.), Owner
   - **Load Details:** PO Number, ASN Number, Pallet Count, Load Status (Loaded/Empty)
   - **Driver Information:** Name, License Number
   - **Operational Requirements:** Load Type (Inbound/Outbound), Duration (minutes)
3. System validates:
   - Carrier authorization for facility
   - Trailer type compatibility with available resources
   - Scheduling conflicts

**Data Captured:**
```json
{
  "appointmentId": "APT-20260308-001",
  "trailerNumber": "TRL-001",
  "trailerType": "40 FT Container",
  "carrierId": "CAR-001",
  "poNumber": "PO-12345",
  "palletCount": 20,
  "loadStatus": "Loaded",
  "startTime": "2026-03-15T10:00:00Z",
  "durationMinutes": 60,
  "loadType": "Inbound",
  "appointmentType": "Live"
}
```

**Result:** Appointment enters **SCHEDULED** state

---

### Phase 2: RESOURCE ASSIGNMENT (Yard Management App)

**Who:** Yard Planner / Operations Manager  
**When:** Upon appointment creation or day-before planning  
**System:** Yard Management App → Resource Allocation Engine

**Actions:**
1. Planner views **appointment queue** sorted by ETA
2. Evaluates available **Docks** and **Yard Slots** based on:
   - Current occupancy status
   - Allowed trailer types per resource
   - Carrier-specific restrictions
   - Configuration logic
3. Assigns **optimal resource** considering:
   - Minimized gate-to-dock distance
   - Load/unload operation mode compatibility
   - Resource specialization (inbound vs. outbound)
4. System confirms assignment or suggests alternatives

**Configuration Rules Applied:**
- **Carrier Restrictions:** Premium resources may be reserved for specific carriers
- **Trailer Type Compatibility:** Certain docks only accept specific trailer types
- **Operation Mode:** Docks configured as "Inbound-Only," "Outbound-Only," or "Both"

**Result:**
```
Appointment Status: SCHEDULED → Resource Assigned
Appointment.assignedResourceId: "DOCK-01"
```

---

### Phase 3: GATE-IN NOTIFICATION (Driver Mobile App)

**Who:** Driver (via Mobile App) + Yard Gate Staff  
**When:** Driver arrives at facility entrance  
**System:** Driver Mobile App + Yard Management App

**Actions (Driver):**
1. Driver opens **Driver Mobile App** (location-aware)
2. Enters gate with trailer; **Gate Scanner captures:**
   - Trailer number (license plate scanner or manual)
   - Driver ID
   - Entry timestamp
3. System retrieves associated appointment
4. Driver app displays:
   - **Assigned Dock/Slot location** (map with directions)
   - **Check-in instructions**
   - **Parking guidelines**

**Actions (Yard Gate Staff - optional):**
- Confirms driver identity and trailer condition
- Records any damage/observations
- Issues gate pass/QR code for access

**Data Captured:**
```json
{
  "event": "GATE_IN",
  "trailerNumber": "TRL-001",
  "driverId": "DRV-123",
  "gateTimestamp": "2026-03-15T09:45:00Z",
  "appointmentId": "APT-20260308-001"
}
```

**Result:** Appointment transitions to **IN_YARD** (Preliminary)

---

### Phase 4: DOCK CHECK-IN (Yard Management App)

**Who:** Dock Operations Staff + Driver  
**When:** Driver arrives at assigned dock  
**System:** Yard Management App + Driver Mobile App (bidirectional)

**Actions (Dock Staff):**
1. Receives **dock-in notification** via Yard Management App
2. Verifies trailer against appointment
3. Records **check-in data:**
   - Actual arrival time
   - Dock ID confirmation
   - Vehicle weight (if scale installed): **Check-in Weight**
   - Commodity type / load confirmation
4. Initiates **dwell clock** for operational metrics
5. **Signals Driver App:** "Bay ready for operation"

**Critical Metrics Triggered:**
- **Gate-to-Dock Time** = Check-in time - Gate-in time
- **Dock Dwell Start** = Check-in time

**Data Captured:**
```json
{
  "event": "DOCK_CHECK_IN",
  "appointmentId": "APT-20260308-001",
  "actualArrivalTime": "2026-03-15T09:52:00Z",
  "dockId": "DOCK-01",
  "checkInWeight": 5000,
  "expectedDuration": 60
}
```

**Result:**
```
Appointment Status: DOCKED
Resource Status: OCCUPIED
Dock Dwell Clock: RUNNING
```

---

### Phase 5: YARD OPERATIONS (Driver Mobile App)

**Who:** Driver / Yard Coordinators  
**When:** During dock or yard operations (0-24+ hours)  
**System:** Driver Mobile App + Yard Management App (real-time sync)

#### 5a. In-Bay Load/Unload
- Driver executes loading/unloading operations at assigned dock
- **Driver App displays:**
  - Real-time task checklist
  - Pallet counter / weight progress
  - Dock communications
- **Expected Duration:** 30-120 minutes
- **Monitoring:** System alerts if dwell exceeds threshold

#### 5b. Dock-to-Yard Transfer
- After dock operations, trailer moved to **yard slot** for temporary storage
- **Driver Mobile App Step-by-Step:**
  1. Requests "yard move" via app
  2. System assigns optimal **yard slot**
  3. Driver receives **yard slot location** (GPS + visual map)
  4. Driver moves trailer to slot
  5. Driver confirms arrival via app

**Data Captured:**
```json
{
  "event": "TRAILER_MOVE",
  "trailerNumber": "TRL-001",
  "fromResource": "DOCK-01",
  "toResource": "SLOT-042",
  "moveStartTime": "2026-03-15T11:15:00Z",
  "moveEndTime": "2026-03-15T11:20:00Z"
}
```

#### 5c. Yard Dwell Monitoring
- **Yard Management App** displays:
  - Trailers in yard with dwell duration
  - **Dwell Threshold Alerts:** Default 24 hours
  - Color coding:
    - 🟢 Green: < 12 hours
    - 🟡 Yellow: 12-24 hours
    - 🔴 Red: > 24 hours

**Result:**
```
Appointment Status: IN_YARD
Resource Status: STORED
Yard Dwell Clock: RUNNING
```

---

### Phase 6: GATE-OUT & CLOSURE (Yard Management App + Driver Mobile App)

**Who:** Gate Staff + Dock Staff + Driver  
**When:** Trailer ready to depart  
**System:** Yard Management App + Driver Mobile App

**Actions:**

**6a. Yard-to-Gate Movement**
- Driver navigates from yard slot to exit gate
- **Driver App shows:** Gate location, exit route, any checkpoints
- Driver app sends **geolocation confirmation** upon gate approach

**6b. Gate-Out Process**
- **Gate Staff Actions:**
  1. Scans trailer or accepts mobile confirmation
  2. Records **Check-out Weight**
  3. Records **Check-out Documentation:**
     - Gate exit timestamp
     - Condition notes
     - Carrier sign-off
  4. Issues exit clearance

**Data Captured:**
```json
{
  "event": "GATE_OUT",
  "trailerNumber": "TRL-001",
  "gateOutTime": "2026-03-15T12:30:00Z",
  "checkOutWeight": 4800,
  "weightDifference": 200,
  "documentReference": "DOC-123"
}
```

**6c. Appointment Closure & Metrics Calculation**
- System calculates **performance metrics:**
  - Total Facility Dwell = Gate-out time - Gate-in time
  - Gate-to-Dock Time
  - Dock Occupancy Duration
  - Yard Occupancy Duration
  - Weight compliance

**Result:**
```
Appointment Status: COMPLETED
All Resources: AVAILABLE
Metrics: RECORDED
```

---

## 1.2 Entity State Machines

### 1.2.1 Appointment State Machine

```
┌──────────────┐
│   PENDING    │  (Created, awaiting resource assignment)
└──────┬───────┘
       │ assign_resource()
       ▼
┌──────────────┐
│  SCHEDULED   │  (Resource assigned, awaiting arrival)
└──────┬───────┘
       │ gate_in()
       ▼
┌──────────────┐
│   IN_YARD    │  (Trailer at facility, pre-dock or post-dock)
└──────┬───────┘
       │ check_in_dock()
       ▼
┌──────────────┐
│    DOCKED    │  (Active load/unload at resource)
└──────┬───────┘
       │ (move_to_yard OR gate_out)
       │
  ┌────┴──────────┐
  │               │
  ▼               ▼
┌───────────┐   ┌──────────┐
│ IN_YARD   │   │ COMPLETED│  (Exited facility)
│(Stored)   │   └──────────┘
└───────────┘
  │
  └─ gate_out()

CANCEL PATHS (from any non-COMPLETED state):
Any State → CANCELLED  (via cancel_appointment())
```

| **State** | **Description** | **Valid Transitions** | **User Role** |
|-----------|-----------------|----------------------|---------------|
| **PENDING** | Appointment created, awaiting resource allocation | → SCHEDULED, → CANCELLED | Carrier, Planner |
| **SCHEDULED** | Resource assigned, waiting for driver arrival | → IN_YARD, → CANCELLED | Driver, Gate Staff |
| **IN_YARD** | Trailer at facility but not at dock | → DOCKED, → GATE_OUT, → CANCELLED | Driver, Dock Staff |
| **DOCKED** | Active operations at dock | → IN_YARD, → GATE_OUT | Driver, Dock Staff |
| **COMPLETED** | Trailer exited facility | *(terminal state)* | System |
| **CANCELLED** | Appointment cancelled | *(terminal state)* | Carrier, Admin |

---

### 1.2.2 Trailer State Machine

| **State** | **Description** | **Metrics Active** | **Resource Blocked** |
|-----------|-----------------|-------------------|----------------------|
| **INACTIVE** | Not in current operations | None | No |
| **SCHEDULED** | Upcoming appointment assigned | Scheduling SLA | Reserved |
| **AT_GATE** | Entered facility, pre-dock | Gate-to-dock timer | Assigned resource reserved |
| **AT_DOCK** | Occupying dock | Dock dwell timer | Yes, dock occupied |
| **IN_YARD** | Temporary storage | Yard dwell timer | Reserved yard slot |
| **DEPARTED** | Exited facility, metrics finalized | Post-event analytics | No |

---

### 1.2.3 Driver State Machine

| **State** | **Location** | **Appointment Status** | **App Screen** |
|-----------|--------------|----------------------|----------------|
| **AVAILABLE** | Off-site | None | Task queue/dashboard |
| **ASSIGNED** | Off-site | PENDING/SCHEDULED | Briefing: trailer details |
| **EN_ROUTE** | Mobile (GPS tracking) | SCHEDULED | Navigation map to facility |
| **AT_FACILITY** | Gate checkpoint | IN_YARD | Gate check-in screen |
| **IN_OPERATION** | Dock/Yard | DOCKED or IN_YARD | Real-time operation checklist |
| **DEPARTING** | Facility (exit route) | IN_YARD/COMPLETED | Exit confirmation, gate directions |

---

### 1.2.4 Resource State Machine

| **State** | **Occupancy** | **Assignable** | **Dwell Clock** | **Alerts** |
|-----------|---------------|----------------|-----------------|------------|
| **AVAILABLE** | No | Yes | No | None |
| **RESERVED** | No (pending) | No | Pending clock | Scheduling alerts |
| **OCCUPIED** | Yes | No | Active (dwell) | Dwell threshold alerts |
| **MAINTENANCE** | N/A | No | N/A | Unavailable flag |

---

## 1.3 Configuration Logic: Carriers, Resources, and Global Settings

### 1.3.1 Carrier Configuration

Each Carrier entity defines **organizational and operational preferences:**

```json
{
  "carrierId": "CAR-001",
  "name": "Swift Logistics Inc.",
  "status": "Active",
  "contactEmail": "ops@swift-logistics.com",
  "facilityAccess": ["FAC-001", "FAC-002"],
  "configuration": {
    "allowedTrailerTypes": ["40 FT Container", "20 FT Container"],
    "docksRequired": ["DOCK-01", "DOCK-02"],
    "reservedYardSlots": 5,
    "defaultDurationMinutes": 60,
    "dwellThresholdHours": 24,
    "priorityLevel": "Premium",
    "autoAssignmentEnabled": true,
    "requiresWeightVerification": true,
    "ewayBillCompliance": true
  },
  "operationalHours": {
    "monday": [{ "start": "06:00", "end": "22:00" }]
  }
}
```

**Rules Derived:**
- Appointments from CAR-001 can only be assigned to DOCK-01 or DOCK-02
- Maximum 5 trailers can occupy yard slots simultaneously
- If load > 2 hours, system flags for carrier review
- E-Way Bill validation required before gate-out

---

### 1.3.2 Resource Configuration

Each Resource (Dock or Yard Slot) defines **operational capabilities:**

```json
{
  "resourceId": "DOCK-01",
  "name": "Dock 1 - Inbound",
  "type": "Dock",
  "facility": "FAC-001",
  "status": "Available",
  "configuration": {
    "operationMode": "Inbound",
    "allowedTrailerTypes": ["40 FT Container", "20 FT Container"],
    "allowedCarriers": ["CAR-001", "CAR-002"],
    "capacity": 1,
    "processTimePerPallet": 5,
    "estimatedDefaultDuration": 60,
    "temperatureControlled": false,
    "hasWeighScale": true
  }
}
```

**Rules Derived:**
- DOCK-01 accepts only Inbound loads
- No outbound appointments can be assigned
- Only CAR-001 and CAR-002 trailers allowed
- Appointments with > 20 pallets need special scheduling

---

### 1.3.3 Global System Settings

**Organization-level configuration** accessible via `/api/settings`:

```json
{
  "facilityName": "SwiftYard Hub - Chicago",
  "timeZone": "America/Chicago",
  "workingHours": {
    "monday": [
      { "id": "1", "name": "Morning Shift", "startTime": "06:00", "endTime": "14:00" },
      { "id": "2", "name": "Evening Shift", "startTime": "14:00", "endTime": "22:00" }
    ]
  },
  "dwellThresholds": {
    "dock": 4,
    "yard": 24,
    "escalationHours": 20
  },
  "compliance": {
    "ewayBillRequired": true,
    "weightVerification": true
  }
}
```

---

# PART 2: TECHNICAL ARCHITECTURE — "THE HOW"

## 2.1 System Interactions: API Handshakes & Webhooks

### 2.1.1 Multi-App Communication Model

SwiftYard employs a **centralized REST API backend** with three independent frontend clients:

```
┌────────���─────────────────────────────────────────┐
│              FRONTEND LAYER (React)              │
│  ┌────────────────┐  ┌────────────────┐ ┌──────┐│
│  │ Carrier App    │  │ Yard Mgmt App  │ │Driver││
│  └────────────────┘  └────────────────┘ │ App  ││
│           │                 │            └──────┘│
└───────────┼─────────────────┼────────────────────┘
            │                 │
            └─────────┬───────┘
                      │ HTTP/JSON
            ┌─────────▼────────────┐
            │   API SERVER         │
            │ (Express.js, :4000)  │
            │                      │
            │  • Authentication    │
            │  • Authorization     │
            │  • Rate Limiting     │
            │  • Error Handling    │
            └─────────┬────────────┘
                      │ libSQL/Turso
            ┌─────────▼────────────┐
            │   DATABASE           │
            │ (Turso/libSQL)       │
            └──────────────────────┘
```

### 2.1.2 API Endpoint Map by App

#### **Carrier App Endpoints:**

| **Endpoint** | **Method** | **Purpose** |
|--------------|-----------|------------|
| `/api/auth/login` | POST | Carrier user authentication |
| `/api/appointments` | GET | List all carrier appointments |
| `/api/appointments` | POST | Create new appointment |
| `/api/appointments/:id` | GET | Retrieve appointment details |
| `/api/appointments/:id/cancel` | POST | Cancel appointment |
| `/api/dashboard/metrics` | GET | Carrier-specific KPIs |

#### **Yard Management App Endpoints:**

| **Endpoint** | **Method** | **Purpose** |
|--------------|-----------|------------|
| `/api/appointments` | GET | List all appointments (facility-scoped) |
| `/api/appointments/:id/checkin` | POST | Dock check-in |
| `/api/appointments/:id/checkout` | POST | Dock check-out |
| `/api/resources` | GET | List docks & yard slots |
| `/api/trailers/:id/move-to-yard` | POST | Move trailer to yard slot |
| `/api/trailers/:id/gateout` | POST | Gate-out trailer |
| `/api/dashboard/metrics` | GET | Facility operational metrics |

#### **Driver Mobile App Endpoints:**

| **Endpoint** | **Method** | **Purpose** |
|--------------|-----------|------------|
| `/api/appointments` | GET | Driver's assigned appointments |
| `/api/trailers/:id/gate-in` | POST | Register trailer entry |
| `/api/appointments/:id/yard-move` | POST | Initiate yard move |
| `/api/locations/:facilityId` | GET | Facility map & waypoints |

---

### 2.1.3 Webhook Integration Pattern

**Outbound Webhooks (System → External):**

```json
{
  "webhookUrl": "https://carrier-erp.example.com/webhook/swiftyard",
  "events": [
    "appointment.created",
    "appointment.scheduled",
    "appointment.gate_in",
    "appointment.completed",
    "dwell.threshold_warning"
  ]
}
```

**Webhook Payload Example:**

```json
{
  "event": "appointment.dock_checkin",
  "timestamp": "2026-03-15T09:52:00Z",
  "facilityId": "FAC-001",
  "data": {
    "appointmentId": "APT-20260308-001",
    "trailerNumber": "TRL-001",
    "dockId": "DOCK-01",
    "gateToDockDurationMinutes": 7
  }
}
```

---

## 2.2 Data Integrity: Ensuring Flawless Synchronization

### 2.2.1 Concurrency Conflict Resolution

**Scenario: Simultaneous Dock Check-In**

```
Timeline: T=09:50 UTC
  Driver Mobile App → POST /api/appointments/APT-001/checkin
  Yard Mgmt App → POST /api/appointments/APT-001/checkin (same time)

Database Conflict Resolution:
  1. First-Write-Wins: First request commits; second gets 409 Conflict
  2. Idempotent Operation: Safe to retry
  3. Client Handling:
     - Mobile app receives 409, refreshes state
     - Yard app receives 409, displays notification
```

### 2.2.2 Real-Time Synchronization

**Offline-First Pattern:**

```
Driver Mobile (Offline):
  1. Enqueue action locally
  2. Show optimistic UI
  3. Continue gathering data

Network Reconnect:
  1. Detect connectivity
  2. Flush offline queue via POST /api/sync/batch
  3. Validate on server
  4. Return new state snapshot
  5. Update local cache
  6. Notify other connected clients
```

### 2.2.3 Audit Trail

Every state change is immutably recorded:

```json
{
  "id": "AUD-20260315-00001",
  "entityType": "appointment",
  "entityId": "APT-20260308-001",
  "action": "state_change",
  "previousState": { "status": "DOCKED" },
  "newState": { "status": "IN_YARD" },
  "changedBy": "DRV-123",
  "changedAt": "2026-03-15T09:52:03Z",
  "source": "driver-app"
}
```

---

## 2.3 Logical Components: Service Layer

### 2.3.1 Authentication Service

- User login with JWT token generation
- Role-based access control (RBAC)
- Token validation middleware
- Session management

### 2.3.2 Notification Service

**Notification Types & Triggers:**

| **Event** | **Recipient** | **Channel** |
|-----------|---------------|------------|
| Gate-In Confirmation | Driver | Mobile Push |
| Resource Assignment | Yard Planner | Email/Push |
| Dock Dwell Warning | Carrier | Email |
| Yard Dwell Alert | Carrier + Yard Mgr | Email + SMS |
| Gate-Out Complete | Carrier | Email |

### 2.3.3 Inventory Service

- Trailer operations (create, update, status)
- Resource management (docks, yard slots)
- Driver assignments
- Availability tracking

### 2.3.4 Scheduling Service

- Appointment creation and state transitions
- Resource allocation and optimization
- Configuration rule enforcement
- Conflict detection

### 2.3.5 Metrics & Analytics Service

**Key Metrics:**

```json
{
  "pendingAppointments": 5,
  "occupiedDocks": 3,
  "trailersInYard": 8,
  "dockOccupancyRate": 37,
  "avgGateToDock": 15,
  "avgDockDwell": 45,
  "avgYardDwell": 0,
  "longStayTrailers": 0,
  "performanceScore": 87,
  "complianceScore": 95
}
```

---

# PART 3: UI/UX NAVIGATION COMPONENT

## 3.1 Search Component Design

### 3.1.1 Search Logic: Keyword-to-Section Mapping

SwiftYard employs a **semantic keyword matching engine**:

```
User Query Input
      ↓
[Tokenization & Normalization]
      ↓
[Semantic Analysis]
  ├─ Exact keyword match
  ├─ Fuzzy match
  ├─ Synonym resolution
  └─ Context inference
      ↓
[Relevance Ranking]
  ├─ Exact matches (weight: 1.0)
  ├─ Partial matches (weight: 0.7)
  ├─ Context-relevant (weight: 0.5)
  └─ Related topics (weight: 0.3)
      ↓
[Result Display]
```

### 3.1.2 Keyword Mapping Reference

| **Search Query** | **Primary Section** | **Relevance** |
|---|---|---|
| **"gate-in"** | Gate-In Protocols | 1.0 |
| **"gate-out"** | Gate-Out Procedures | 1.0 |
| **"gate"** | Yard Operations | 0.98 |
| **"dock"** | Resource Types | 0.95 |
| **"dock check-in"** | Dock Check-In | 1.0 |
| **"dwell"** | Dwell Monitoring | 0.98 |
| **"yard slot"** | Yard Slots | 0.94 |
| **"yard move"** | Yard Move | 1.0 |
| **"trailer"** | Trailer Entity | 0.92 |
| **"appointment"** | Appointment Lifecycle | 0.95 |
| **"driver"** | Driver Entity | 0.91 |
| **"resource allocation"** | Resource Assignment | 0.97 |
| **"cannot dock"** | Resource Issues | 0.82 |
| **"API"** | API Handshakes | 0.91 |
| **"webhook"** | Webhooks | 0.88 |
| **"sync"** | Synchronize, update, refresh | 0.85 |
| **"KPI"** | Metrics & Analytics | 0.90 |

### 3.1.3 Synonyms Reference

```
gate-in: entrance, arrival, entry, check-in-gate
gate-out: exit, departure, leave, checkout-gate
dock: bay, loading-area, platform
yard: storage, lot, staging-area
dwell: wait, stay, idle, occupancy-time
trailer: truck, vehicle, shipment
appointment: slot, booking, reservation
cancel: reject, abort, withdraw
resource: dock, slot, facility
weight: load, mass, verification
error: issue, problem, failure
sync: synchronize, update, refresh
```

---

## 3.2 Search UI Implementation

**Wireframe: Help Search Component**

```
┌─────────────────────────────────────────────────────────┐
│  SwiftYard Help Documentation                          │
├─────────────────────────────────────────────────────────┤
│  🔍 [Search help topics...                    🔽]      │
│  ─────────────────────────────────────────────────      │
│                                                         │
│  Recent searches:                                       │
│  ├─ gate-in procedures                                  │
│  ├─ dock dwell alerts                                   │
│  └─ driver assignment                                   │
│                                                         │
│  Search Results (relevance ranked):                     │
│                                                         │
│  [1] Gate-In Protocols ⭐⭐⭐⭐⭐ (1.0)                    │
│      Section 1.1.3 | Guide | 5 min read                │
│      [Read More →]                                      │
│                                                         │
│  [2] Appointment Lifecycle ⭐⭐⭐⭐ (0.95)                │
│      Section 1.1 | Overview | 8 min read               │
│      [Read More →]                                      │
│                                                         │
│  Related Sections:                                      │
│  ├─ Driver Mobile App Guide (0.75 relevance)           │
│  └─ Troubleshooting: Gate Issues (0.68 relevance)      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3.3 Contextual Help Triggers

**In-App Contextual Help (Floating Assistance):**

```
User clicks ❓ on form field
    ↓
Tooltip appears:
  - Field description
  - Expected format
  - Example values
  - Link to full documentation
```

**Contextual Help on Error:**

```
System returns error
    ↓
Display error message with:
  - Reason for error
  - Current vs. expected state
  - Step-by-step resolution
  - Link to relevant guide
  - Contact escalation option
```

---

## 3.4 App-Specific Navigation Guides

### For Carriers:
- Appointment Creation (§ 1.1.1)
- Appointment States (§ 1.2.1)
- Carrier Configuration (§ 1.3.1)
- Carrier App Guide

### For Yard Planners/Managers:
- Resource Assignment (§ 1.1.2)
- Configuration (§ 1.3.2-1.3.3)
- Logical Components (§ 2.3)
- Yard Management App Guide

### For Drivers:
- Yard Operations (§ 1.1.3-1.1.5)
- Driver States (§ 1.2.3)
- Real-Time Synchronization (§ 2.2.2)
- Driver Mobile App Guide

### For Developers/Integrators:
- System Interactions (§ 2.1)
- Data Integrity (§ 2.2)
- Services (§ 2.3)
- Database & API (§ 2.1.2)
