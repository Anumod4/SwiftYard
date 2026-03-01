import { config } from 'dotenv';
import { runMigrations, initializeSchema } from '../turso';

config();

async function migrate() {
    console.log("Running migrations...");
    await runMigrations();
    // Initialize schema catches missing tables but won't wipe data
    await initializeSchema();
    console.log("Migrations applied successfully.");
    process.exit(0);
}

migrate();
