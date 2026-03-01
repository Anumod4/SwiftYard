import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "swiftyard-secret-key-change-in-production";

const token = process.argv[2];

if (!token) {
    console.log("Usage: npx tsx test-token.ts <your_token_string>");
    process.exit(1);
}

try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("\\n✅ Token Signature is VALID!");
    console.log("Decoded Payload:", JSON.stringify(decoded, null, 2));
} catch (err: any) {
    console.log("\\n❌ Token VERIFICATION FAILED!");
    console.log("Error:", err.message);

    // Try to decode without verification to see what's inside
    try {
        const rawDecode = jwt.decode(token);
        if (rawDecode) {
            console.log("\\n⚠️ This token could not be verified by this server's secret, but here is what is inside it:");
            console.log(JSON.stringify(rawDecode, null, 2));
            if ((rawDecode as any).iss && ((rawDecode as any).iss as string).includes('clerk')) {
                console.log("\\n🚨 Diagnosed Issue: This is a CLERK token, NOT a SwiftYard API token!");
            }
        } else {
            console.log("\\n🚨 Diagnosed Issue: This is not a valid JWT format at all.");
        }
    } catch (e) {
        console.log("\\n🚨 Diagnosed Issue: This is not a valid JWT format at all.");
    }
}
