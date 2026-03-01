import { fetchAll } from './server/db.js';

async function checkDb() {
    try {
        const users = await fetchAll('users');
        console.log(`Found ${users.length} users in DB.`);
        users.forEach(u => {
            console.log(`- UID: ${u.uid}, Email: ${u.email}, Role: ${u.role}`);
        });
    } catch (err) {
        console.error("DB Error:", err);
    }
}

checkDb();
