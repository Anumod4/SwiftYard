import { turso, safeJsonParse, safeJsonStringify } from '../turso';

const JSON_FIELDS = [
  'history', 'photos', 'documents', 'allowedTrailerTypes', 'allowedCarrierIds',
  'unavailability', 'assignedFacilities', 'permissions', 'accessLevels', 'data', 'workingHours',
  'googleDrive', 'dwellThresholds', 'metricsRange', 'instructionDurations', 'adminWhatsappRecipients',
  'adminWhatsappNumbers', 'whatsappConfig', 'billingOverrides', 'performance'
];

const BOOLEAN_FIELDS = ['isBobtail', 'isSystem'];

export const parseRow = (row: any): any => {
  const obj = { ...row };

  JSON_FIELDS.forEach(key => {
    if (obj[key] && typeof obj[key] === 'string') {
      obj[key] = safeJsonParse(obj[key]);
    }
  });

  BOOLEAN_FIELDS.forEach(key => {
    if (obj[key] !== undefined) {
      obj[key] = Boolean(obj[key]);
    }
  });

  return obj;
};

export const prepareForInsert = (item: any): any => {
  const prepared: any = {};

  for (const [key, value] of Object.entries(item)) {
    if (value === undefined) {
      prepared[key] = null;
    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
      prepared[key] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      prepared[key] = value ? 1 : 0;
    } else {
      prepared[key] = value;
    }
  }

  return prepared;
};

// Generic fetch all from table
export const fetchAll = async (tableName: string): Promise<any[]> => {
  console.log(`[DB] fetchAll from ${tableName}`);
  const result = await turso.execute(`SELECT * FROM ${tableName}`);
  console.log(`[DB] fetchAll ${tableName} returned ${result.rows.length} rows`);
  return result.rows.map(parseRow);
};

// Fetch by ID
export const fetchById = async (tableName: string, id: string, idColumn: string = 'id'): Promise<any | null> => {
  console.log(`[DB] fetchById from ${tableName} where ${idColumn}=${id}`);
  const result = await turso.execute({
    sql: `SELECT * FROM ${tableName} WHERE ${idColumn} = ?`,
    args: [id]
  });
  console.log(`[DB] fetchById ${tableName} returned ${result.rows.length} rows`);
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
};

// Fetch all with facility filter
export const fetchByFacility = async (tableName: string, facilityId: string): Promise<any[]> => {
  const result = await turso.execute({
    sql: `SELECT * FROM ${tableName} WHERE facilityId = ?`,
    args: [facilityId]
  });
  return result.rows.map(parseRow);
};

// Insert new record
export const insert = async (tableName: string, item: any): Promise<string> => {
  const prepared = prepareForInsert(item);
  const keys = Object.keys(prepared);
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map(k => prepared[k]);

  const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
  console.log(`[DB] Insert into ${tableName}:`, sql, values);
  try {
    const result = await turso.execute({ sql, args: values });
    console.log(`[DB] Insert result:`, result);
  } catch (err: any) {
    console.error(`[DB] Insert error into ${tableName}:`, err);
    throw err;
  }

  // Return the ID (either provided or generated)
  return item.id || item.uid || `GEN-${Date.now()}`;
};

// Update record by ID
export const update = async (tableName: string, id: string, updates: any, idColumn: string = 'id'): Promise<void> => {
  const prepared = prepareForInsert(updates);
  const keys = Object.keys(prepared);
  const setClause = keys.map(k => `${k} = ?`).join(',');
  const values = keys.map(k => prepared[k]);

  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = ?`;
  await turso.execute({ sql, args: [...values, id] });
};

// Delete record by ID
export const remove = async (tableName: string, id: string, idColumn: string = 'id'): Promise<void> => {
  await turso.execute({
    sql: `DELETE FROM ${tableName} WHERE ${idColumn} = ?`,
    args: [id]
  });
};

// Execute raw query (for complex operations)
export const executeQuery = async (sql: string, args: any[] = []): Promise<any[]> => {
  const result = await turso.execute({ sql, args });
  return result.rows.map(parseRow);
};

// Transaction support
export const transaction = async (fn: () => Promise<void>): Promise<void> => {
  try {
    await turso.execute('BEGIN TRANSACTION');
    await fn();
    await turso.execute('COMMIT');
  } catch (error) {
    await turso.execute('ROLLBACK');
    throw error;
  }
};
