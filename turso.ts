
import { createClient } from "@libsql/client";

// ============================================================================
// TURSO CONFIGURATION
// ============================================================================

// Read from process.env but fallback to the hardcoded database initially provided
const dbUrl = process.env.TURSO_DB_URL || "libsql://swiftyard-anumodk.aws-ap-northeast-1.turso.io";
const dbToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzEwMjQzOTAsImlkIjoiN2NiNGI4YjYtNzI3Mi00NTQ3LTgyOWQtMTMzZTc5OTI3YjdiIiwicmlkIjoiNWY2YzE4YWQtOTk2ZS00MDI3LWE0ZDctM2E1OTc1YzU5ZjExIn0.1Aegycg6qgnyHwf90xLeeE3NvAkq3cVJWlTAOlm8rFmPzwhYnwhohuGkSl8z1Jp7Yk6zMS0ovWJ_nQhYmojMCQ";

export const turso = createClient({
  url: dbUrl,
  authToken: dbToken,
});

// --- HELPERS ---

export const safeJsonParse = (str: any) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

export const safeJsonStringify = (val: any) => {
  return val ? JSON.stringify(val) : null;
};

// --- DATA ACCESS HELPERS ---

export const fetchTable = async (tableName: string) => {
  const result = await turso.execute(`SELECT * FROM ${tableName}`);
  return result.rows.map(row => {
    // Auto-parse common JSON fields based on naming convention or table specific logic
    const obj: any = { ...row };

    // Common JSON fields
    ['history', 'photos', 'documents', 'allowedTrailerTypes', 'allowedCarrierIds', 'unavailability', 'assignedFacilities', 'permissions', 'accessLevels'].forEach(key => {
      if (obj[key] && typeof obj[key] === 'string') {
        obj[key] = safeJsonParse(obj[key]);
      }
    });

    // Boolean conversions (0/1 to false/true)
    ['isBobtail', 'isSystem'].forEach(key => {
      if (obj[key] !== undefined) obj[key] = Boolean(obj[key]);
    });

    return obj;
  });
};

export const insertItem = async (table: string, item: any) => {
  const keys = Object.keys(item);
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map(k => {
    const val = item[k];
    if (val === undefined) return null;
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });

  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
  await turso.execute({ sql, args: values });
};

export const updateItem = async (table: string, id: string, updates: any, idColumn: string = 'id') => {
  const keys = Object.keys(updates);
  const setClause = keys.map(k => `${k} = ?`).join(',');
  const values = keys.map(k => {
    const val = updates[k];
    if (val === undefined) return null;
    if (Array.isArray(val) || (typeof val === 'object' && val !== null)) return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`;
  await turso.execute({ sql, args: [...values, id] });
};

export const deleteItem = async (table: string, id: string, idColumn: string = 'id') => {
  await turso.execute({ sql: `DELETE FROM ${table} WHERE ${idColumn} = ?`, args: [id] });
};

export const runMigrations = async () => {
  try {
    await turso.execute("ALTER TABLE users ADD COLUMN password TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE users ADD COLUMN carrierId TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE users ADD COLUMN firstName TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE users ADD COLUMN lastName TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE users ADD COLUMN username TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE users ADD COLUMN facilityId TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE trailers ADD COLUMN checkOutDocNumber TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE resources ADD COLUMN operationMode TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE resources ADD COLUMN capacity INTEGER");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE appointments ADD COLUMN loadType TEXT");
    await turso.execute("ALTER TABLE appointments ADD COLUMN appointmentType TEXT");
    await turso.execute("ALTER TABLE appointments ADD COLUMN rejectionReason TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE roles ADD COLUMN accessLevels TEXT");
    console.log("Migration: 'accessLevels' column added to 'roles' table.");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN facilityId TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN secret TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN isActive INTEGER DEFAULT 1");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN name TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN createdAt TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE webhooks ADD COLUMN updatedAt TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE facilities ADD COLUMN carrierId TEXT");
  } catch (e: any) { /* Ignore */ }

  try {
    await turso.execute("ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'Away'");
  } catch (e: any) { /* Ignore */ }
};

export const initializeSchema = async () => {
  console.log("Initializing Turso Schema & Seeding Data...");

  try {
    // 1. Facilities
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        code TEXT
      );
    `);

    // 2. Users
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT,
        password TEXT,
        displayName TEXT,
        firstName TEXT,
        lastName TEXT,
        username TEXT,
        photoURL TEXT,
        role TEXT,
        facilityId TEXT,
        assignedFacilities TEXT,
        carrierId TEXT,
        updatedAt TEXT
      );
    `);

    // 3. Roles
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        isSystem INTEGER DEFAULT 0,
        permissions TEXT,
        accessLevels TEXT
      );
    `);

    // 4. Resources
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        name TEXT,
        type TEXT,
        status TEXT,
        operationMode TEXT,
        allowedTrailerTypes TEXT,
        allowedCarrierIds TEXT,
        currentAppId TEXT,
        currentTrailerId TEXT,
        unavailability TEXT,
        capacity INTEGER
      );
    `);

    // 5. Carriers
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS carriers (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        name TEXT,
        contactEmail TEXT,
        contactPhone TEXT
      );
    `);

    // 6. Drivers
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        name TEXT,
        licenseNumber TEXT,
        phone TEXT,
        carrierId TEXT,
        status TEXT DEFAULT 'Away'
      );
    `);

    // 7. Trailer Types
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trailer_types (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        name TEXT,
        defaultDuration INTEGER,
        processTimePerPallet REAL
      );
    `);

    // 8. Appointments
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        trailerNumber TEXT,
        trailerType TEXT,
        isBobtail INTEGER,
        driverName TEXT,
        carrierId TEXT,
        poNumber TEXT,
        asnNumber TEXT,
        palletCount INTEGER,
        loadStatus TEXT,
        startTime TEXT,
        durationMinutes INTEGER,
        status TEXT,
        assignedResourceId TEXT,
        history TEXT,
        acknowledgementStatus TEXT,
        acknowledgementTime TEXT,
        instructionTimestamp TEXT,
        loadType TEXT,
        appointmentType TEXT,
        rejectionReason TEXT
      );
    `);

    // 9. Trailers
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trailers (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        number TEXT,
        type TEXT,
        owner TEXT,
        carrierId TEXT,
        currentDriverId TEXT,
        currentAppointmentId TEXT,
        status TEXT,
        location TEXT,
        targetResourceId TEXT,
        history TEXT,
        ewayBillNumber TEXT,
        ewayBillExpiry TEXT,
        checkInWeight REAL,
        checkOutWeight REAL,
        checkOutDocNumber TEXT,
        photos TEXT,
        documents TEXT,
        instructionTimestamp TEXT
      );
    `);

    // 10. Settings
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        data TEXT
      );
    `);

    // 11. Webhooks
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        facilityId TEXT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

    // 12. Webhook Logs
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        webhookId TEXT,
        event TEXT,
        payload TEXT,
        responseStatus INTEGER,
        responseBody TEXT,
        success INTEGER,
        createdAt TEXT
      );
    `);

    // Seed Settings
    await turso.execute({
      sql: "INSERT OR IGNORE INTO settings (id, data) VALUES ('global', ?)",
      args: [JSON.stringify({
        yardName: 'SwiftYard',
        language: 'en',
        theme: 'dark',
        enableNotifications: true,
        workingHours: {}
      })]
    });

    // Seed Carrier Role
    await turso.execute({
      sql: "INSERT OR IGNORE INTO roles (id, name, description, isSystem, permissions) VALUES (?, ?, ?, ?, ?)",
      args: ['carrier', 'Transport Carrier', 'Carrier portal access only', 1, JSON.stringify(['carrier-dashboard'])]
    });

    // Seed Admin Role (Full Access)
    await turso.execute({
      sql: "INSERT OR IGNORE INTO roles (id, name, description, isSystem, permissions) VALUES (?, ?, ?, ?, ?)",
      args: ['admin', 'Administrator', 'Full system access', 1, JSON.stringify(['dashboard', 'appointments', 'trailers', 'drivers', 'carriers', 'resources', 'reports', 'settings', 'admin-users', 'admin-roles', 'admin-facilities'])]
    });

    // Seed User Role (Staff)
    await turso.execute({
      sql: "INSERT OR IGNORE INTO roles (id, name, description, isSystem, permissions) VALUES (?, ?, ?, ?, ?)",
      args: ['user', 'Staff User', 'Standard yard operations access', 1, JSON.stringify(['dashboard', 'appointments', 'trailers', 'drivers'])]
    });

    console.log("Schema initialization successful.");
    return true;
  } catch (error) {
    console.error("Schema initialization failed:", error);
    throw error;
  }
};
