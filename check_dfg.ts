import { createClient } from '@libsql/client';
const client = createClient({
    url: process.env.TURSO_DB_URL || "libsql://swiftyard-anumodk.aws-ap-northeast-1.turso.io",
    authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzEwMjQzOTAsImlkIjoiN2NiNGI4YjYtNzI3Mi00NTQ3LTgyOWQtMTMzZTc5OTI3YjdiIiwicmlkIjoiNWY2YzE4YWQtOTk2ZS00MDI3LWE0ZDctM2E1OTc1YzU5ZjExIn0.1Aegycg6qgnyHwf90xLeeE3NvAkq3cVJWlTAOlm8rFmPzwhYnwhohuGkSl8z1Jp7Yk6zMS0ovWJ_nQhYmojMCQ"
});

async function run() {
    try {
        const res = await client.execute("SELECT * FROM trailers WHERE number LIKE '%DFG%'");
        console.log("TRAILERS:");
        console.log(JSON.stringify(res.rows, null, 2));

        const appts = await client.execute("SELECT * FROM appointments WHERE trailerNumber LIKE '%DFG%'");
        console.log("APPTS:");
        console.log(JSON.stringify(appts.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
