
import Dexie, { Table } from 'dexie';
import { Appointment, Resource, Driver, Trailer, TrailerTypeDefinition, Carrier, AppSettings } from './types';
import { MOCK_DOCKS, MOCK_SLOTS, MOCK_APPOINTMENTS, MOCK_DRIVERS, MOCK_TRAILERS, MOCK_TRAILER_TYPES, MOCK_CARRIERS } from './constants';

export class SwiftYardDatabase extends Dexie {
  resources!: Table<Resource>;
  appointments!: Table<Appointment>;
  drivers!: Table<Driver>;
  trailers!: Table<Trailer>;
  trailerTypes!: Table<TrailerTypeDefinition>;
  carriers!: Table<Carrier>;
  settings!: Table<AppSettings & { id?: number }>;

  constructor() {
    super('SwiftYardDB');
    
    // Version 3: Add startTime and trailerType indexes for sorting and querying
    (this as any).version(3).stores({
      resources: 'id, type, status',
      appointments: 'id, status, assignedResourceId, driverName, trailerNumber, trailerType, startTime',
      drivers: 'id, name',
      trailers: 'id, number',
      trailerTypes: 'name',
      carriers: 'id, name',
      settings: '++id'
    });

    // Populate data if new
    (this as any).on('populate', () => {
       // Seed with Mocks or Generate Defaults if mocks are empty. 
       // We create copies to avoid mutating imported constants.
       let initialDocks = [...MOCK_DOCKS];
       let initialSlots = [...MOCK_SLOTS];
       let initialDrivers = [...MOCK_DRIVERS];

       const defaultFacilityId = 'FAC-MAIN';

       // If mocks are empty (as they are in the current constants), generate some defaults for better UX
       if (initialDocks.length === 0) {
          for(let i=1; i<=8; i++) {
             initialDocks.push({
               id: `DOCK-${String(i).padStart(2, '0')}`,
               facilityId: defaultFacilityId,
               name: `Dock ${String(i).padStart(2, '0')}`,
               type: 'Dock',
               status: 'Available',
               allowedTrailerTypes: i <= 4 ? ['20 FT Container', '40 FT Container'] : ['Single Axle Open', 'Multi Axle Open', 'Light Commercial Vehicle'],
               allowedCarrierIds: []
             });
          }
       }
       if (initialSlots.length === 0) {
          for(let i=1; i<=10; i++) {
             initialSlots.push({
               id: `SLOT-${String(i).padStart(2, '0')}`,
               facilityId: defaultFacilityId,
               name: `Slot ${String(i).padStart(2, '0')}`,
               type: 'YardSlot',
               status: 'Available',
               allowedTrailerTypes: [],
               allowedCarrierIds: []
             });
          }
       }
       
       // Note: MOCK_DRIVERS is now populated in constants, so we use it directly via initialDrivers variable above.

       this.resources.bulkAdd([...initialDocks, ...initialSlots]);
       this.appointments.bulkAdd(MOCK_APPOINTMENTS);
       this.drivers.bulkAdd(initialDrivers);
       this.trailers.bulkAdd(MOCK_TRAILERS);
       this.trailerTypes.bulkAdd(MOCK_TRAILER_TYPES);
       this.carriers.bulkAdd(MOCK_CARRIERS);
       this.settings.add({ 
           yardName: 'SwiftYard', 
           theme: 'dark', 
           enableNotifications: true,
           googleDrive: {
               clientId: "880201239801-eao7tath6uurcg0u6o6tt1p5qr51l3lf.apps.googleusercontent.com",
               connected: false,
               fileId: "1ACNQ1YKHDgWQxnKI_uy0ReNKt5bKjgLODUAfO-DYzhM"
           }
       });
    });
  }
}

export const db = new SwiftYardDatabase();
