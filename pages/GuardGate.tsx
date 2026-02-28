
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Truck, LogIn, LogOut, Search, User, FileText, Camera, Plus, Scale, X, CheckCircle2, Calendar } from 'lucide-react';
import { QuickAddDriverModal } from '../components/QuickAddDriverModal';
import { ModalPortal } from '../components/ui/ModalPortal';
import { TrailerStatus } from '../types';

export const GuardGate: React.FC = () => {
  const { 
      appointments, trailers, drivers, carriers, trailerTypes, docks,
      addTrailer, updateTrailer, updateAppointment, gateOutTrailer: triggerGateOut, addAppointment,
      t, addToast, settings
  } = useData();

  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
  
  // Gate In Form
  const [trailerNum, setTrailerNum] = useState('');
  const [trailerType, setTrailerType] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierName, setCarrierName] = useState(''); // Allow free text if not in DB
  const [ewayBill, setEwayBill] = useState('');
  const [docExpiry, setDocExpiry] = useState(''); // New State for Expiry
  const [weight, setWeight] = useState('');
  
  // Gate Out Form & Modal
  const [outSearch, setOutSearch] = useState('');
  const [gateOutModalOpen, setGateOutModalOpen] = useState(false);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [checkoutWeight, setCheckoutWeight] = useState('');
  const [checkoutDocs, setCheckoutDocs] = useState('');

  // Modals
  const [isQuickAddDriverOpen, setIsQuickAddDriverOpen] = useState(false);

  // Filter Drivers: Only show "Away" drivers (not currently on site)
  const availableDrivers = useMemo(() => {
      // 1. Identify drivers currently on-site (linked to trailers with active status)
      const onSiteDriverIds = new Set(
          trailers
              .filter(t => ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'CheckedOut', 'MovingToYard', 'InYard'].includes(t.status) && t.currentDriverId)
              .map(t => t.currentDriverId)
      );

      // 2. Filter drivers list
      return drivers.filter(d => {
          // Must not be on site
          if (onSiteDriverIds.has(d.id)) return false;
          
          // If a driver has been auto-populated (driverId is set), always show them
          if (driverId && d.id === driverId) return true;
          
          // If carrier selected, must match carrier (case-insensitive comparison for carrier name)
          if (carrierId && d.carrierId) {
              const match = d.carrierId.toLowerCase() === carrierId.toLowerCase() || 
                           d.carrierId.toLowerCase() === carrierId?.toLowerCase();
              if (!match) return false;
          }
          
          return true;
      });
  }, [drivers, trailers, carrierId, driverId]);

  const handleDriverSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setDriverId(selectedId);
      
      if (selectedId) {
          const driver = drivers.find(d => d.id === selectedId);
          if (driver) {
              setDriverName(driver.name);
              setDriverLicense(driver.licenseNumber);
              setDriverPhone(driver.phone);
              // If no carrier selected, auto-select driver's carrier
              if (!carrierId && driver.carrierId) {
                  // Driver's carrierId now stores carrier name
                  setCarrierId(driver.carrierId);
                  setCarrierName(driver.carrierId);
              }
          }
      } else {
          setDriverName('');
          setDriverLicense('');
          setDriverPhone('');
      }
  };

  // Handle Carrier Selection - filters drivers and clears driver if not compatible
  const handleCarrierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedCarrier = e.target.value;
      setCarrierId(selectedCarrier);
      
      // Find carrier name
      const carrier = carriers.find(c => c.id === selectedCarrier || c.name === selectedCarrier);
      setCarrierName(carrier?.name || selectedCarrier);
      
      // Clear driver if it's not from the newly selected carrier
      if (driverId) {
          const driver = drivers.find(d => d.id === driverId);
          if (driver && driver.carrierId && driver.carrierId.toLowerCase() !== selectedCarrier.toLowerCase()) {
              setDriverId('');
              setDriverName('');
              setDriverLicense('');
              setDriverPhone('');
          }
      }
  };

  // Auto-fill logic
  const handleTrailerBlur = () => {
      if (!trailerNum.trim()) return;
      const normalizedNum = trailerNum.toLowerCase().trim();

      // 1. Check for Scheduled or PendingApproval Appointment (Priority for today's data)
      // PendingApproval status is for carrier-created appointments that need yard approval
      const scheduled = appointments.find(a => 
          (a.status === 'Scheduled' || a.status === 'PendingApproval') && 
          a.trailerNumber?.trim().toLowerCase() === normalizedNum
      );

      if (scheduled) {
          // DEBUG: Log the appointment data to see what's available
          console.log('[GuardGate] Found appointment:', scheduled);
          
          // Populate from Appointment
          if (scheduled.trailerType) setTrailerType(scheduled.trailerType);
          
          // Carrier - populate from appointment (carrierId now stores carrier name)
          console.log('[GuardGate] Appointment carrierId:', scheduled.carrierId, 'Available carriers:', carriers.map(c => ({ id: c.id, name: c.name })));
          if (scheduled.carrierId) {
              // Try to find carrier by name first (since carrierId now stores name)
              let carrier = carriers.find(ca => ca.name.toLowerCase() === scheduled.carrierId?.toLowerCase());
              // Try case-insensitive ID match
              if (!carrier) carrier = carriers.find(ca => ca.id.toLowerCase() === scheduled.carrierId?.toLowerCase());
              
              if (carrier) {
                  setCarrierId(carrier.name);  // Use carrier name as value to match dropdown
                  setCarrierName(carrier.name);
              } else {
                  // Carrier not found - set the name as-is
                  setCarrierId(scheduled.carrierId);
                  setCarrierName(scheduled.carrierId);
              }
          } else {
              // No carrierId in appointment - clear carrier fields
              setCarrierId('');
              setCarrierName('');
          }

          // Attempt to fill driver details if known
          console.log('[GuardGate] Looking for driver:', scheduled.driverName, 'Available drivers:', drivers.map(d => ({ id: d.id, name: d.name, phone: d.phone })));
          if (scheduled.driverName) {
              // Try to find driver by name (case-insensitive)
              let knownDriver = drivers.find(d => d.name.toLowerCase().trim() === scheduled.driverName?.toLowerCase().trim());
              
              // If not found by exact match, try partial match
              if (!knownDriver) {
                  knownDriver = drivers.find(d => d.name.toLowerCase().includes(scheduled.driverName?.toLowerCase().trim()));
              }
              
              if (knownDriver) {
                  console.log('[GuardGate] Driver found:', knownDriver);
                  setDriverId(knownDriver.id);
                  setDriverName(knownDriver.name);
                  setDriverLicense(knownDriver.licenseNumber);
                  setDriverPhone(knownDriver.phone);
              } else {
                  // If driver is unknown in our system, fill the name but can't select from dropdown
                  console.log('[GuardGate] Driver not found in drivers list, using appointment driverName');
                  setDriverId(''); 
                  setDriverName(scheduled.driverName || '');
                  setDriverLicense('');
                  setDriverPhone('');
              }
          }

          const statusMsg = scheduled.status === 'PendingApproval' 
              ? "Pending Approval - Please approve before gating in" 
              : "Found Schedule";
          addToast(scheduled.status === 'PendingApproval' ? "Appointment Pending" : "Found Schedule", 
              scheduled.status === 'PendingApproval' 
                  ? "This appointment requires approval before gate-in" 
                  : "Details loaded from scheduled appointment.", 
              scheduled.status === 'PendingApproval' ? "info" : "success");
          return; 
      }

      // 2. Fallback to Trailer Registry (History)
      const existing = trailers.find(t => (t.number || '').toLowerCase().trim() === normalizedNum);
      if (existing) {
          // If we have an existing trailer, populate known fields
          let dataFound = false;

          if (existing.carrierId) {
              // Try to find carrier by name first (since carrierId now stores name)
              let carrier = carriers.find(ca => ca.name.toLowerCase() === existing.carrierId?.toLowerCase());
              // Try case-insensitive ID match
              if (!carrier) carrier = carriers.find(ca => ca.id.toLowerCase() === existing.carrierId?.toLowerCase());
              
              if (carrier) {
                  setCarrierId(carrier.name);  // Use carrier name as value to match dropdown
                  setCarrierName(carrier.name);
              } else {
                  setCarrierId(existing.carrierId);
                  setCarrierName(existing.owner || existing.carrierId);
              }
              dataFound = true;
          }
          
          if (existing.type && existing.type !== 'Unknown') {
              setTrailerType(existing.type);
              dataFound = true;
          }

          // Try to find the last known driver for this trailer
          let dId = existing.currentDriverId;
          let driver = drivers.find(d => d.id === dId);
          
          // If not found by ID, try to find by name
          if (!driver && existing.currentDriverId) {
              driver = drivers.find(d => d.name.toLowerCase() === existing.currentDriverId?.toLowerCase());
          }
          
          if (driver) {
              setDriverId(driver.id);
              setDriverName(driver.name);
              setDriverLicense(driver.licenseNumber);
              setDriverPhone(driver.phone);
              dataFound = true;
          }
          
          if (dataFound) {
              addToast("Auto-filled", "Trailer and Driver details loaded from history.", "info", 3000);
          }
      }
  };

  const handleGateIn = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
          console.log('[GuardGate] Starting gate in process for:', trailerNum);
          console.log('[GuardGate] Current trailers:', trailers.map(t => ({ id: t.id, number: t.number })));
          
          // Determine Initial Status and Target based on Settings
          let initialStatus: TrailerStatus = 'GatedIn';
          let targetResId: string | undefined = undefined;
          let instructionTime: string | undefined = undefined;
          let apptStatus: string | undefined = undefined;

          // Check if appointment exists to see if we can use DockDirect
          const existingAppt = appointments.find(a => a.trailerNumber?.toLowerCase() === trailerNum.toLowerCase() && a.status === 'Scheduled');
          console.log('[GuardGate] Found appointment:', existingAppt);

          if (settings.gateInFlow === 'YardDefault' && settings.defaultYardSlotId) {
              // Option 1: Move to Default Yard
              initialStatus = 'MovingToYard';
              targetResId = settings.defaultYardSlotId;
              instructionTime = new Date().toISOString();
              // Note: We don't automatically update appointment status to MovingToYard, it stays Scheduled/GatedIn usually until dock
              // but effectively it's GatedIn from an appointment perspective.
              apptStatus = existingAppt ? 'GatedIn' : undefined;

          } else if (settings.gateInFlow === 'DockDirect' && existingAppt && existingAppt.assignedResourceId) {
              // Option 2: Move to Dock (If assigned and available)
              const assignedDock = docks.find(d => d.id === existingAppt.assignedResourceId);
              if (assignedDock && assignedDock.status === 'Available') {
                  initialStatus = 'MovingToDock';
                  instructionTime = new Date().toISOString();
                  apptStatus = 'MovingToDock';
              } else {
                  // Fallback if dock occupied or invalid
                  initialStatus = 'GatedIn';
                  apptStatus = 'GatedIn';
              }
          } else {
              // Standard GatedIn (Ad-hoc or no automation configured)
              initialStatus = 'GatedIn';
              apptStatus = existingAppt ? 'GatedIn' : undefined;
          }

          // 1. Determine if Trailer exists, create or update
          const existingTrailer = trailers.find(t => t.number?.toLowerCase() === trailerNum.toLowerCase());
          console.log('[GuardGate] Existing trailer found:', existingTrailer);
          
          // Get carrier name to save (use carrierName which has the resolved name, fallback to carrierId)
          const carrierToSave = carrierName || carrierId || '';
          
          // Get facilityId from existing appointment or use current facility
          const facilityIdForTrailer = existingAppt?.facilityId || '';
          console.log('[GuardGate] Facility ID for trailer:', facilityIdForTrailer);
          
          // Also get from localStorage as backup
          const localStorageFacility = localStorage.getItem('swiftyard_facility_id');
          console.log('[GuardGate] Facility from localStorage:', localStorageFacility);
          
          const trailerPayload: any = {
              status: initialStatus,
              type: trailerType || 'Unknown',
              carrierId: carrierToSave || undefined,  // Save carrier NAME (not ID) to match other parts of the system
              owner: carrierToSave || 'Unknown',       // Also save as owner for display
              currentDriverId: driverId || undefined,
              ewayBillNumber: ewayBill || undefined,
              ewayBillExpiry: docExpiry || undefined,
              checkInWeight: weight ? parseFloat(weight) : undefined,
              targetResourceId: targetResId,
              instructionTimestamp: instructionTime,
              facilityId: facilityIdForTrailer || localStorageFacility || undefined  // Include facilityId for trailer creation
          };
          console.log('[GuardGate] Trailer payload:', trailerPayload);

          if (existingTrailer) {
              console.log('[GuardGate] Updating existing trailer:', existingTrailer.id);
              await updateTrailer(existingTrailer.id, trailerPayload);
          } else {
              // Create new trailer record
              const id = `TRL-${Date.now()}`;
              console.log('[GuardGate] Creating new trailer with id:', id, 'payload:', trailerPayload);
              try {
                  await addTrailer({ ...trailerPayload, id, number: trailerNum });
                  console.log('[GuardGate] Trailer created successfully');
              } catch (err) {
                  console.error('[GuardGate] Error creating trailer:', err);
                  addToast('Error', 'Failed to create trailer: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
                  return;
              }
          }

          // 2. Update or Create Appointment
          if (existingAppt) {
              await updateAppointment(existingAppt.id, {
                  status: apptStatus as any || 'GatedIn',
                  driverName: driverName,
                  carrierId: carrierToSave || undefined,  // Save carrier NAME
                  instructionTimestamp: instructionTime
              });
          } else {
              // Create ad-hoc appointment
              await addAppointment({
                  trailerNumber: trailerNum,
                  trailerType: trailerType,
                  driverName: driverName,
                  carrierId: carrierToSave || undefined,  // Save carrier NAME
                  status: 'Scheduled', // Ad-hoc always starts Scheduled logic-wise, then immediate gate-in
                  startTime: new Date().toISOString(),
                  durationMinutes: 60,
                  isBobtail: false
              });
              // Note: The logic above assumes ad-hoc doesn't trigger DockDirect because no dock assigned yet.
              // So for ad-hoc, it effectively just Gates In.
          }

          addToast('Entry Processed', `${trailerNum} gated in successfully.`, 'success');
          
          // Reset Form
          setTrailerNum('');
          setTrailerType('');
          setDriverId('');
          setDriverName('');
          setDriverLicense('');
          setDriverPhone('');
          setCarrierId('');
          setCarrierName('');
          setEwayBill('');
          setDocExpiry('');
          setWeight('');

      } catch (err: any) {
          addToast('Error', err.message, 'error');
      }
  };

  const openGateOutModal = (id: string) => {
      setSelectedTrailerId(id);
      setCheckoutWeight('');
      setCheckoutDocs('');
      setGateOutModalOpen(true);
  };

  const handleGateOutConfirm = async () => {
      if (!selectedTrailerId) return;
      try {
          await triggerGateOut(
              selectedTrailerId, 
              checkoutWeight ? parseFloat(checkoutWeight) : undefined, 
              checkoutDocs || undefined
          );
          setGateOutModalOpen(false);
          setSelectedTrailerId(null);
      } catch (err: any) {
          addToast('Error', err.message, 'error');
      }
  };

  const handleQuickAddSuccess = (newId: string, name: string, cId?: string) => {
      setDriverId(newId);
      setDriverName(name);
      if (cId) setCarrierId(cId);
  };

  // Filter for Gate Out Tab
  const trailersToExit = trailers.filter(t => 
      ['CheckedOut', 'ReadyForCheckOut'].includes(t.status) &&
      (t.number.toLowerCase().includes(outSearch.toLowerCase()))
  );

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('guard.title')}</h1>
          <p className="text-slate-500 dark:text-gray-400">{t('guard.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('in')}
            className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 ${activeTab === 'in' ? 'bg-white dark:bg-white/10 border-blue-500 shadow-xl' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
              <LogIn className={`w-6 h-6 ${activeTab === 'in' ? 'text-blue-500' : ''}`} />
              <span className="font-black text-lg uppercase">{t('guard.induct')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('out')}
            className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 ${activeTab === 'out' ? 'bg-white dark:bg-white/10 border-orange-500 shadow-xl' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
              <LogOut className={`w-6 h-6 ${activeTab === 'out' ? 'text-orange-500' : ''}`} />
              <span className="font-black text-lg uppercase">{t('guard.exodus')}</span>
          </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'in' ? (
              <GlassCard className="p-8 max-w-4xl mx-auto">
                  <form onSubmit={handleGateIn} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          
                          {/* Vehicle Details */}
                          <div className="space-y-6">
                              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-2">Vehicle Information</h3>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">{t('guard.trailerNum')} *</label>
                                  <div className="relative">
                                      <Truck className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                      <input 
                                        required
                                        value={trailerNum}
                                        onChange={e => setTrailerNum(e.target.value)}
                                        onBlur={handleTrailerBlur}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-slate-900 dark:text-white uppercase focus:border-blue-500 outline-none"
                                        placeholder="Enter Trailer ID"
                                      />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Trailer Type</label>
                                  <select 
                                    value={trailerType}
                                    onChange={e => setTrailerType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none"
                                  >
                                      <option value="">-- Select Type --</option>
                                      {trailerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">{t('guard.carrier')}</label>
                                  <select 
                                    value={carrierId}
                                    onChange={handleCarrierSelect}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none"
                                  >
                                      <option value="">-- {t('guard.selectCarrier')} --</option>
                                      {carriers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                  </select>
                              </div>
                          </div>

                          {/* Driver Details */}
                          <div className="space-y-6">
                              <div className="flex justify-between items-center border-b pb-2">
                                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Driver Information</h3>
                                  <button type="button" onClick={() => setIsQuickAddDriverOpen(true)} className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:text-blue-400">
                                      <Plus className="w-3 h-3"/> New Driver
                                  </button>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">{t('guard.driverName')} *</label>
                                  <div className="relative">
                                      <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                      <select 
                                        required
                                        value={driverId}
                                        onChange={handleDriverSelect}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none appearance-none"
                                      >
                                          <option value="">-- Select Driver --</option>
                                          {availableDrivers.map(d => (
                                              <option key={d.id} value={d.id}>{d.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">{t('guard.driverLicense')}</label>
                                      <input 
                                        value={driverLicense}
                                        onChange={e => setDriverLicense(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                        placeholder="License #"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">{t('guard.driverPhone')}</label>
                                      <input 
                                        value={driverPhone}
                                        onChange={e => setDriverPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                        placeholder="Phone #"
                                      />
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Document Information</label>
                                      <div className="flex gap-2">
                                          <input 
                                            value={ewayBill}
                                            onChange={e => setEwayBill(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                            placeholder="Doc Number (Optional)"
                                          />
                                          <button type="button" className="px-3 bg-slate-200 dark:bg-white/10 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-white/20">
                                              <Camera className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Document Expiry</label>
                                      <div className="relative">
                                          <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                          <input 
                                            type="date"
                                            value={docExpiry}
                                            onChange={e => setDocExpiry(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Gate In Weight (kg)</label>
                                      <div className="relative">
                                          <Scale className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                          <input 
                                            type="number"
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                                            placeholder="Optional"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
                          <button 
                            type="submit"
                            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                          >
                              <LogIn className="w-5 h-5" /> {t('guard.gateInBtn')}
                          </button>
                      </div>
                  </form>
              </GlassCard>
          ) : (
              <div className="space-y-4">
                  <div className="max-w-md mx-auto relative mb-8">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                          value={outSearch}
                          onChange={e => setOutSearch(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                          placeholder="Search vehicle to exit..."
                      />
                  </div>

                  {trailersToExit.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 dark:text-gray-500">
                          <LogOut className="w-16 h-16 mx-auto mb-4 opacity-20" />
                          <p>No vehicles ready for departure found.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {trailersToExit.map(trailer => (
                              <GlassCard key={trailer.id} className="p-6 flex flex-col items-center text-center">
                                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                                      <Truck className="w-8 h-8 text-orange-500" />
                                  </div>
                                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{trailer.number}</h3>
                                  <p className="text-sm text-slate-500 mb-6">{trailer.owner}</p>
                                  
                                  <button 
                                    onClick={() => openGateOutModal(trailer.id)}
                                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                  >
                                      <LogOut className="w-4 h-4" /> {t('guard.gateOutBtn')}
                                  </button>
                              </GlassCard>
                          ))}
                      </div>
                  )}
              </div>
          )}
      </div>

      <QuickAddDriverModal 
          isOpen={isQuickAddDriverOpen}
          onClose={() => setIsQuickAddDriverOpen(false)}
          onSuccess={handleQuickAddSuccess}
      />

      {gateOutModalOpen && (
          <ModalPortal>
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a]">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <LogOut className="w-5 h-5 text-orange-500" /> Confirm Gate Out
                          </h2>
                          <button onClick={() => setGateOutModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="p-6 space-y-5">
                          <p className="text-sm text-slate-500 dark:text-gray-400">
                              Please verify checkout details for trailer.
                          </p>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Checkout Weight (kg)</label>
                              <div className="relative">
                                  <Scale className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                  <input 
                                      type="number"
                                      value={checkoutWeight}
                                      onChange={e => setCheckoutWeight(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      placeholder="Optional"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5">Document Information</label>
                              <div className="relative">
                                  <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                  <input 
                                      value={checkoutDocs}
                                      onChange={e => setCheckoutDocs(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      placeholder="Optional"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 p-4 bg-slate-50 dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/10">
                          <button onClick={() => setGateOutModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</button>
                          <button 
                              onClick={handleGateOutConfirm}
                              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center gap-2"
                          >
                              <CheckCircle2 className="w-4 h-4" /> Confirm Exit
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}
    </div>
  );
};
