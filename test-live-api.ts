async function test() {
    const token = process.argv[2];
    if (!token) {
        console.log("Usage: npx tsx test-live-api.ts <token>");
        process.exit(1);
    }

    console.log("--- Testing Auth Token Against Both Environments ---");

    console.log("\\n1. Testing against LOCALHOST (http://localhost:4000)...");
    try {
        const res = await fetch('http://localhost:4000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
    } catch (e: any) {
        console.log("Local fetch error:", e.message);
    }

    console.log("\\n2. Testing against RENDER (https://swiftyard.onrender.com)...");
    try {
        const res = await fetch('https://swiftyard.onrender.com/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
    } catch (e: any) {
        console.log("Render fetch error:", e.message);
    }
}

test();
