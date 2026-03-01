import { initializeSchema, runMigrations } from "./server/../turso";

async function run() {
    console.log("Testing initializeSchema...");
    try {
        await initializeSchema();
        console.log("Testing runMigrations...");
        await runMigrations();
        console.log("DONE");
        process.exit(0);
    } catch (e: any) {
        console.error("FAILED", e.message);
    }
}

run();
