import { fetchAll, update, insert, remove } from './server/db.js';
import { turso } from './turso.js';

async function migrateCarriers() {
    console.log('Starting migration...');
    try {
        const carriers = await fetchAll('carriers');
        const idMapping: Record<string, string> = {};

        // 1. Map old IDs to names and create new carriers
        for (const carrier of carriers) {
            if (carrier.id !== carrier.name) {
                idMapping[carrier.id] = carrier.name;
                const newCarrier = { ...carrier, id: carrier.name };

                // Insert new carrier
                console.log(`Inserting new carrier: ${newCarrier.id}`);
                await insert('carriers', newCarrier);

                // Remove old carrier
                console.log(`Removing old carrier: ${carrier.id}`);
                await remove('carriers', carrier.id);
            }
        }

        console.log('ID Mapping:', idMapping);

        if (Object.keys(idMapping).length === 0) {
            console.log('No carriers need updating.');
            return;
        }

        // 2. Update Resources (JSON array of allowedCarrierIds)
        const resources = await fetchAll('resources');
        for (const resource of resources) {
            let updated = false;
            let newAllowedCarrierIds = resource.allowedCarrierIds ? [...resource.allowedCarrierIds] : [];

            newAllowedCarrierIds = newAllowedCarrierIds.map((id: string) => {
                if (idMapping[id]) {
                    updated = true;
                    return idMapping[id];
                }
                return id;
            });

            if (updated) {
                console.log(`Updating resource ${resource.name} (${resource.id}) with new allowedCarrierIds: ${newAllowedCarrierIds}`);
                await update('resources', resource.id, { allowedCarrierIds: newAllowedCarrierIds });
            }
        }

        // 3. Update Trailers
        const trailers = await fetchAll('trailers');
        for (const trailer of trailers) {
            if (trailer.carrierId && idMapping[trailer.carrierId]) {
                const newCarrierId = idMapping[trailer.carrierId];
                console.log(`Updating trailer ${trailer.number} carrierId to ${newCarrierId}`);
                await update('trailers', trailer.id, { carrierId: newCarrierId });
            }
        }

        // 4. Update Appointments
        const appointments = await fetchAll('appointments');
        for (const apt of appointments) {
            if (apt.carrierId && idMapping[apt.carrierId]) {
                const newCarrierId = idMapping[apt.carrierId];
                console.log(`Updating appointment ${apt.id} carrierId to ${newCarrierId}`);
                await update('appointments', apt.id, { carrierId: newCarrierId });
            }
        }

        // 5. Update Drivers
        const drivers = await fetchAll('drivers');
        for (const driver of drivers) {
            if (driver.carrierId && idMapping[driver.carrierId]) {
                const newCarrierId = idMapping[driver.carrierId];
                console.log(`Updating driver ${driver.name} carrierId to ${newCarrierId}`);
                await update('drivers', driver.id, { carrierId: newCarrierId });
            }
        }

        // 6. Update Users
        const users = await fetchAll('users');
        for (const user of users) {
            if (user.carrierId && idMapping[user.carrierId]) {
                const newCarrierId = idMapping[user.carrierId];
                console.log(`Updating user ${user.email} carrierId to ${newCarrierId}`);
                await update('users', user.uid, { carrierId: newCarrierId }, 'uid');
            }
        }

        console.log('Migration completed successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrateCarriers();
