# SwiftYard API Collection for Bruno

## Quick Start

1. **Download Bruno**: https://www.usebruno.com/
2. **Import Collection**: Open Bruno → Collections → Import → Select `bruno-api-collection` folder
3. **Configure Environment**: Select "Local" environment from dropdown
4. **Run Login**: Click "Auth > Login" request and press Send (▶️)
5. **Use Other APIs**: Token is automatically stored in environment variable

## Default Credentials

- **Email**: superadmin@swiftyard.com
- **Password**: SuperSecretPassword123!

## API Endpoints

| Folder | Description |
|--------|-------------|
| Auth | Login, get current user |
| Appointments | List, create, update, cancel, check-in, check-out |
| Trailers | List, create, update, gate-out, move-to-yard |
| Drivers | List, create, update, delete |
| Carriers | List, create, update, delete |
| Resources | List, create, update, clear |
| Admin | List users |
| Dashboard | Get metrics |
| Webhooks | List, create, get events, get logs, delete |

## Webhook Events

Available webhook events:
- `appointment.created`, `appointment.updated`, `appointment.cancelled`, `appointment.checkedIn`, `appointment.checkedOut`
- `trailer.created`, `trailer.updated`, `trailer.gateOut`, `trailer.movedToYard`
- `driver.created`, `driver.updated`, `driver.deleted`
- `carrier.created`, `carrier.updated`, `carrier.deleted`
- `resource.created`, `resource.updated`, `resource.cleared`

## Environment Variables

- `baseUrl` - API URL (http://localhost:4000)
- `token` - JWT token (auto-set after login)
- `appointmentId`, `trailerId`, `driverId`, `carrierId`, `resourceId`, `webhookId` - Auto-set after create operations

## curl Examples

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "superadmin@swiftyard.com", "password": "SuperSecretPassword123!"}'

# Create Webhook
curl -X POST http://localhost:4000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "My Webhook", "url": "https://example.com/webhook", "events": ["appointment.created"]}'

# Create Appointment (triggers webhook)
curl -X POST "http://localhost:4000/api/appointments?facilityId=FAC-001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"trailerNumber": "TRL-001", "trailerType": "40 FT Container", "driverName": "John Doe", "startTime": "2026-02-23T14:00:00Z", "durationMinutes": 60}'

# Check Webhook Logs
curl http://localhost:4000/api/webhooks/WH-xxx/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## WebSocket Support

The server also supports real-time updates via Socket.IO:
- Connect to `http://localhost:4000` with JWT token
- Join facility room: `socket.emit('join-facility', 'FAC-001')`
- Listen for events like `appointment:created`, `trailer:updated`, etc.
