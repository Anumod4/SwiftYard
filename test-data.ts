import { fetchAll } from './server/db.js';

async function checkTrailersAndDocks() {
    try {
        const trailers = await fetchAll('trailers');
        const trailer = trailers.find(t => t.number === 'IOP123' || (t.id && t.id.includes('IOP123')));
        console.log('--- Trailer IOP123 ---');
        if (trailer) {
            console.log(JSON.stringify(trailer, null, 2));
        } else {
            console.log('Not found');
        }

        const resources = await fetchAll('resources');
        const docks = resources.filter(r => r.name === 'DOCK 01' || r.name === 'DOCK 03' || r.name === 'Dock 01' || r.name === 'Dock 03');
        console.log('\n--- Docks ---');
        docks.forEach(d => {
            console.log(JSON.stringify(d, null, 2));
        });

    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

checkTrailersAndDocks();
