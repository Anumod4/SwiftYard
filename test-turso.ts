import { createClient } from "@libsql/client";

const TURSO_DB_URL = "libsql://swiftyard-anumodk.aws-ap-northeast-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzEwMjQzOTAsImlkIjoiN2NiNGI4YjYtNzI3Mi00NTQ3LTgyOWQtMTMzZTc5OTI3YjdiIiwicmlkIjoiNWY2YzE4YWQtOTk2ZS00MDI3LWE0ZDctM2E1OTc1YzU5ZjExIn0.1Aegycg6qgnyHwf90xLeeE3NvAkq3cVJWlTAOlm8rFmPzwhYnwhohuGkSl8z1Jp7Yk6zMS0ovWJ_nQhYmojMCQ";

console.log("Testing Turso connection via libsql://...");

const client = createClient({
    url: TURSO_DB_URL,
    authToken: TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log("Executing query...");
        const res = await client.execute("SELECT 1 as val");
        console.log("Success! val =", res.rows[0].val);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

run();
