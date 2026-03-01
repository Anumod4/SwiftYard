import { config } from 'dotenv';
import { fetchAll, update } from '../server/db';

config();

async function backfillDriverStatus() {
    console.log('--- Starting Driver Status Backfill ---');

    try {
        // 1. Fetch all drivers
        const drivers = await fetchAll('drivers');
        console.log(`Found ${drivers.length} drivers.`);

        // 2. Fetch all trailers to calculate 'On Site' instances
        const trailers = await fetchAll('trailers');
        console.log(`Found ${trailers.length} total trailers.`);

        // 3. Identify drivers currently on-site (linked to trailers with active status)
        const onSiteDriverIds = new Set(
            trailers
                .filter(t => ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'CheckedOut', 'MovingToYard', 'InYard'].includes(t.status) && t.currentDriverId)
                .map(t => t.currentDriverId)
        );

        console.log(`Identified ${onSiteDriverIds.size} drivers currently on-site.`);

        // 4. Update each driver
        let updatedCount = 0;
        for (const driver of drivers) {
            const correctStatus = onSiteDriverIds.has(driver.id) ? 'On Site' : 'Away';

            // If driver doesn't have status field mapped natively, or it mismatches, update it
            if (driver.status !== correctStatus) {
                console.log(`Updating Driver ${driver.id} (${driver.name}) to '${correctStatus}'`);

                await update('drivers', driver.id, {
                    status: correctStatus
                });
                updatedCount++;
            }
        }

        console.log(`--- Backfill Complete! Updated ${updatedCount} drivers. ---`);

    } catch (error) {
        console.error('Error during driver backfill:', error);
    } finally {
        process.exit(0);
    }
}

backfillDriverStatus();
