import jwt from 'jsonwebtoken';
import { fetchAll } from './server/db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "swiftyard-secret-key-change-in-production";

async function verifyTokenLogic() {
    const users = await fetchAll('users');
    console.log("Users in DB:", users.map((u: any) => ({ uid: u.uid, email: u.email })));

    // Try encoding one of the users and decoding it to see what the middleware expects
    const testUser = users[0];
    if (testUser) {
        const payload = {
            uid: testUser.uid,
            email: testUser.email,
            role: testUser.role,
        };
        const token = jwt.sign(payload, JWT_SECRET);
        console.log("\\nGenerated Test Token for", testUser.uid);
        // console.log(token);

        // Decode it back
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            console.log("\\nDecoded payload UID:", decoded.uid);
            const found = users.find((u: any) => u.uid === decoded.uid);
            console.log("User found in DB after decode:", !!found);
        } catch (err) {
            console.error("Decode error:", err);
        }
    }
}

verifyTokenLogic();
