"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = exports.executeQuery = exports.remove = exports.update = exports.insert = exports.fetchByFacility = exports.fetchById = exports.fetchAll = exports.prepareForInsert = exports.parseRow = void 0;
const turso_1 = require("../turso");
const JSON_FIELDS = [
    'history', 'photos', 'documents', 'allowedTrailerTypes', 'allowedCarrierIds',
    'unavailability', 'assignedFacilities', 'permissions', 'accessLevels', 'data', 'workingHours',
    'googleDrive', 'dwellThresholds', 'metricsRange', 'instructionDurations', 'adminWhatsappRecipients',
    'adminWhatsappNumbers', 'whatsappConfig'
];
const BOOLEAN_FIELDS = ['isBobtail', 'isSystem'];
const parseRow = (row) => {
    const obj = { ...row };
    JSON_FIELDS.forEach(key => {
        if (obj[key] && typeof obj[key] === 'string') {
            obj[key] = (0, turso_1.safeJsonParse)(obj[key]);
        }
    });
    BOOLEAN_FIELDS.forEach(key => {
        if (obj[key] !== undefined) {
            obj[key] = Boolean(obj[key]);
        }
    });
    return obj;
};
exports.parseRow = parseRow;
const prepareForInsert = (item) => {
    const prepared = {};
    for (const [key, value] of Object.entries(item)) {
        if (value === undefined) {
            prepared[key] = null;
        }
        else if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
            prepared[key] = JSON.stringify(value);
        }
        else if (typeof value === 'boolean') {
            prepared[key] = value ? 1 : 0;
        }
        else {
            prepared[key] = value;
        }
    }
    return prepared;
};
exports.prepareForInsert = prepareForInsert;
// Generic fetch all from table
const fetchAll = async (tableName) => {
    console.log(`[DB] fetchAll from ${tableName}`);
    const result = await turso_1.turso.execute(`SELECT * FROM ${tableName}`);
    console.log(`[DB] fetchAll ${tableName} returned ${result.rows.length} rows`);
    return result.rows.map(exports.parseRow);
};
exports.fetchAll = fetchAll;
// Fetch by ID
const fetchById = async (tableName, id, idColumn = 'id') => {
    console.log(`[DB] fetchById from ${tableName} where ${idColumn}=${id}`);
    const result = await turso_1.turso.execute({
        sql: `SELECT * FROM ${tableName} WHERE ${idColumn} = ?`,
        args: [id]
    });
    console.log(`[DB] fetchById ${tableName} returned ${result.rows.length} rows`);
    if (result.rows.length === 0)
        return null;
    return (0, exports.parseRow)(result.rows[0]);
};
exports.fetchById = fetchById;
// Fetch all with facility filter
const fetchByFacility = async (tableName, facilityId) => {
    const result = await turso_1.turso.execute({
        sql: `SELECT * FROM ${tableName} WHERE facilityId = ?`,
        args: [facilityId]
    });
    return result.rows.map(exports.parseRow);
};
exports.fetchByFacility = fetchByFacility;
// Insert new record
const insert = async (tableName, item) => {
    const prepared = (0, exports.prepareForInsert)(item);
    const keys = Object.keys(prepared);
    const placeholders = keys.map(() => '?').join(',');
    const values = keys.map(k => prepared[k]);
    const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
    console.log(`[DB] Insert into ${tableName}:`, sql, values);
    try {
        const result = await turso_1.turso.execute({ sql, args: values });
        console.log(`[DB] Insert result:`, result);
    }
    catch (err) {
        console.error(`[DB] Insert error into ${tableName}:`, err);
        throw err;
    }
    // Return the ID (either provided or generated)
    return item.id || item.uid || `GEN-${Date.now()}`;
};
exports.insert = insert;
// Update record by ID
const update = async (tableName, id, updates, idColumn = 'id') => {
    const prepared = (0, exports.prepareForInsert)(updates);
    const keys = Object.keys(prepared);
    const setClause = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => prepared[k]);
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = ?`;
    await turso_1.turso.execute({ sql, args: [...values, id] });
};
exports.update = update;
// Delete record by ID
const remove = async (tableName, id, idColumn = 'id') => {
    await turso_1.turso.execute({
        sql: `DELETE FROM ${tableName} WHERE ${idColumn} = ?`,
        args: [id]
    });
};
exports.remove = remove;
// Execute raw query (for complex operations)
const executeQuery = async (sql, args = []) => {
    const result = await turso_1.turso.execute({ sql, args });
    return result.rows.map(exports.parseRow);
};
exports.executeQuery = executeQuery;
// Transaction support
const transaction = async (fn) => {
    try {
        await turso_1.turso.execute('BEGIN TRANSACTION');
        await fn();
        await turso_1.turso.execute('COMMIT');
    }
    catch (error) {
        await turso_1.turso.execute('ROLLBACK');
        throw error;
    }
};
exports.transaction = transaction;
