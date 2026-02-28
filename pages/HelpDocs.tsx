
import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { FileText, Code, Printer, Shield, Database, Cpu, Workflow, Users, Truck, Settings, MonitorPlay, List, Info } from 'lucide-react';

export const HelpDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'functional' | 'technical'>('functional');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header - Hidden in Print Mode */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Help & Documentation</h1>
          <p className="text-slate-500 dark:text-gray-400">Standard Operating Procedures (SOP) and System Architecture.</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-slate-200 dark:bg-white/10 p-1 rounded-xl flex gap-1">
                <button 
                    onClick={() => setActiveTab('functional')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'functional' ? 'bg-white dark:bg-[#121212] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <FileText className="w-4 h-4" /> Functional Guide
                </button>
                <button 
                    onClick={() => setActiveTab('technical')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'technical' ? 'bg-white dark:bg-[#121212] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <Code className="w-4 h-4" /> Technical Specs
                </button>
            </div>
            <button 
                onClick={handlePrint}
                className="bg-[#0a84ff] hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
                <Printer className="w-4 h-4" /> Print PDF
            </button>
        </div>
      </div>

      {/* Document Content - Optimized for Print */}
      <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible">
        <GlassCard className="p-10 min-h-full print:border-none print:shadow-none print:p-0 bg-white dark:bg-[#1e1e1e] print:text-black">
            
            {/* ---------------- FUNCTIONAL DOCUMENTATION ---------------- */}
            <div className={activeTab === 'functional' ? 'block' : 'hidden print:hidden'}>
                <div className="prose dark:prose-invert max-w-none">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Workflow className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white print:text-black m-0">Functional Reference Manual</h1>
                            <p className="text-slate-500 dark:text-gray-400 m-0">SwiftYard Logistics Management System v3.2</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" /> 1. User Roles & Permissions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 not-prose">
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                            <strong className="block text-slate-900 dark:text-white mb-2">Administrator</strong>
                            <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                                <li>Global System Configuration</li>
                                <li>User & Role Management</li>
                                <li>Facility Creation & Assignment</li>
                                <li>Master Data (Carriers, Types)</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                            <strong className="block text-slate-900 dark:text-white mb-2">Gatekeeper / Staff</strong>
                            <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                                <li>Check-in / Check-out Operations</li>
                                <li>Guard Gate Entry Processing</li>
                                <li>Appointment Scheduling</li>
                                <li>Yard Slot Allocation</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                            <strong className="block text-slate-900 dark:text-white mb-2">Driver</strong>
                            <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                                <li>Mobile-only Interface</li>
                                <li>Real-time Job View (Move commands)</li>
                                <li>Dock Confirmation</li>
                                <li>No Menu Access</li>
                            </ul>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-5 h-5 text-emerald-500" /> 2. Core Operational Modules
                    </h2>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">2.1 Appointment Management</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        The <strong>Appointments</strong> module is the central planning tool. Appointments track the lifecycle of a visit from scheduling to departure.
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">
                        <li><strong>Cancelling:</strong> Only appointments in <em>Scheduled</em> status can be cancelled. This action automatically frees up the assigned Dock Resource and delinks any associated Trailer record.</li>
                        <li><strong>Editing:</strong> Active appointments can be edited. Completed or Departed appointments are locked to preserve audit history.</li>
                        <li><strong>Smart Scheduling:</strong> When assigning a dock, the system scores available resources based on <em>Allowed Carrier</em> and <em>Trailer Type</em> constraints defined in Resource Management.</li>
                    </ul>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">2.2 Guard Gate (Inbound/Outbound)</h3>
                    <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10 mb-4 text-sm">
                        <strong>Auto-Fill Logic:</strong> When a Security Officer enters a Trailer Number:
                        <ol className="list-decimal pl-5 mt-1">
                            <li>System checks for a <strong>Scheduled Appointment</strong> for today. If found, it pulls Driver, Carrier, and Type data.</li>
                            <li>If no appointment, it searches the <strong>Trailer Registry</strong> history for matching vehicle details to speed up entry.</li>
                        </ol>
                    </div>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">
                        <li><strong>Check-in Weight:</strong> Captured at entry. Used for net weight calculation upon exit.</li>
                        <li><strong>Media Capture:</strong> Supports capturing photos (Vehicle condition) and documents (E-Way Bill) via camera or file upload.</li>
                    </ul>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">2.3 Dashboard & Congestion Watch</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">
                        <li><strong>KPIs:</strong> Tracks <em>Gate-to-Dock</em>, <em>Dock Dwell</em>, and <em>Yard Dwell</em> averages. These stats can be filtered by date range in Settings.</li>
                        <li><strong>Congestion Logic:</strong> Trailers are flagged in the "Congestion Watchlist" if:
                            <ul className="list-disc pl-5 mt-1">
                                <li>Time in Yard &gt; <strong>4 hours</strong> (Configurable in Settings).</li>
                                <li>Time at Dock &gt; <strong>2 hours</strong> (Configurable in Settings).</li>
                            </ul>
                        </li>
                    </ul>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200 flex items-center gap-2">
                        <MonitorPlay className="w-5 h-5 text-blue-500" /> 2.4 Live Board & Driver App Integration
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        The system features a real-time communication loop between the Dispatcher (Trailers UI), the Driver (Mobile App), and the Yard Monitor (Live Board). This eliminates the need for phone calls or walkie-talkies for routine moves.
                    </p>

                    <div className="my-4 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-white/5">
                                <tr>
                                    <th className="p-3 text-left">Step</th>
                                    <th className="p-3 text-left">Actor / UI</th>
                                    <th className="p-3 text-left">Action & Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                <tr>
                                    <td className="p-3 font-bold">1</td>
                                    <td className="p-3">Dispatcher <br/><span className="text-xs text-slate-500">Trailers UI</span></td>
                                    <td className="p-3">
                                        Locates a trailer in the list and clicks <strong>Direct</strong>. Selects an action (e.g., "Assign to Dock 5").
                                        <br/><em>Result: Trailer status updates to 'MovingToDock'. Instruction Timer starts.</em>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-bold">2</td>
                                    <td className="p-3">Driver <br/><span className="text-xs text-slate-500">Mobile App</span></td>
                                    <td className="p-3">
                                        Screen instantly changes to a large "MOVE TO DOCK" view. Shows destination (Dock 5).
                                        <br/><em>Timer shows countdown (if enabled).</em>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-bold">3</td>
                                    <td className="p-3">Yard Staff <br/><span className="text-xs text-slate-500">Live Board</span></td>
                                    <td className="p-3">
                                        Trailer card appears on the big screen with instruction "MOVE TO DOCK". 
                                        <br/><em>If driver takes too long, card turns <strong>RED (Overdue)</strong>.</em>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-bold">4</td>
                                    <td className="p-3">Driver <br/><span className="text-xs text-slate-500">Mobile App</span></td>
                                    <td className="p-3">
                                        Driver parks at dock and taps <strong>"I Have Arrived"</strong> button.
                                        <br/><em>Result: Status updates to 'ReadyForCheckIn'. Timer stops.</em>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-400 italic bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/20">
                        <Info className="w-3 h-3 inline mr-1"/> <strong>Note:</strong> The Countdown Timer display can be toggled On/Off in <em>Settings &gt; Instruction Timers</em>. If disabled, drivers only see an alert when the task becomes Overdue.
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-8">
                        <List className="w-5 h-5 text-purple-500" /> 3. Status Reference Glossary
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                        Definitions for all system statuses used across the application.
                    </p>

                    <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">A. Appointment Statuses</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border border-slate-200 dark:border-white/10 rounded-lg">
                            <thead className="bg-slate-100 dark:bg-white/5 font-bold">
                                <tr>
                                    <th className="p-2 border-b border-r dark:border-white/10 w-40">Status</th>
                                    <th className="p-2 border-b dark:border-white/10">Definition & Trigger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                <tr><td className="p-2 border-r font-mono text-xs">Scheduled</td><td className="p-2">Initial state. Appointment created but vehicle has not arrived.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">GatedIn</td><td className="p-2">Vehicle has passed the Guard Gate but hasn't been assigned a specific dock/slot yet.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">MovingToDock</td><td className="p-2">Driver instructed to move to assigned dock. Transit phase.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">ReadyForCheckIn</td><td className="p-2">Driver has parked at the dock and is waiting for warehouse staff to begin operations.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">CheckedIn</td><td className="p-2">Operation Active. Staff has confirmed vehicle is at dock and loading/unloading has started.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">ReadyForCheckOut</td><td className="p-2">Operations complete. Driver instructed to leave the dock to free it up.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">Completed</td><td className="p-2">Vehicle has left the dock door (Dock is now free). Vehicle usually moves to Yard or Exit.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">Departed</td><td className="p-2">Vehicle has physically left the facility via Guard Gate.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">Cancelled</td><td className="p-2">Appointment voided before completion.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white mt-6 mb-2">B. Trailer Statuses</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border border-slate-200 dark:border-white/10 rounded-lg">
                            <thead className="bg-slate-100 dark:bg-white/5 font-bold">
                                <tr>
                                    <th className="p-2 border-b border-r dark:border-white/10 w-40">Status</th>
                                    <th className="p-2 border-b dark:border-white/10">Definition & Trigger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                <tr><td className="p-2 border-r font-mono text-xs">Scheduled</td><td className="p-2">Pre-registered trailer expected to arrive today.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">GatedIn</td><td className="p-2">Physically inside the facility. Located at holding area or gate buffer.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">MovingToYard</td><td className="p-2">Driver instructed to drop trailer in a specific Yard Slot.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">InYard</td><td className="p-2">Trailer is parked in a Yard Slot (Storage/Staging).</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">MovingToDock</td><td className="p-2">Moving from Gate or Yard to a Dock Door.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">CheckedIn</td><td className="p-2">Parked at Dock Door. Operations in progress.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">ReadyForCheckOut</td><td className="p-2">Operations finished. Driver told to pull away.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">CheckedOut</td><td className="p-2">Pulled away from dock. Waiting to exit or move to yard.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs">GatedOut</td><td className="p-2">Physically left the facility. Historical record only.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white mt-6 mb-2">C. Resource Statuses (Docks/Slots)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border border-slate-200 dark:border-white/10 rounded-lg">
                            <thead className="bg-slate-100 dark:bg-white/5 font-bold">
                                <tr>
                                    <th className="p-2 border-b border-r dark:border-white/10 w-40">Status</th>
                                    <th className="p-2 border-b dark:border-white/10">Definition & Trigger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                <tr><td className="p-2 border-r font-mono text-xs text-emerald-600 font-bold">Available</td><td className="p-2">Resource is empty and ready for assignment.</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs text-blue-600 font-bold">Occupied</td><td className="p-2">A trailer is physically present (Status: CheckedIn).</td></tr>
                                <tr><td className="p-2 border-r font-mono text-xs text-orange-600 font-bold">Unavailable</td><td className="p-2">Resource is down for maintenance or manually blocked.</td></tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* ---------------- TECHNICAL DOCUMENTATION ---------------- */}
            <div className={activeTab === 'technical' ? 'block' : 'hidden print:hidden'}>
                <div className="prose dark:prose-invert max-w-none">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-6">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Cpu className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white print:text-black m-0">Technical Specification</h1>
                            <p className="text-slate-500 dark:text-gray-400 m-0">Architecture, Database Schema & Integration</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-500" /> 1. Data Architecture (Turso / SQLite)
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                        The system utilizes <strong>Turso</strong>, an edge-hosted distributed database based on libSQL (a fork of SQLite).
                        Data is structured in relational tables. Multi-tenancy is implemented logically using <code>facilityId</code> columns on all operational tables, allowing a single database instance to serve multiple facilities while maintaining data isolation in the UI.
                    </p>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">1.1 Core Tables</h3>
                    
                    <div className="space-y-4 mb-8 not-prose">
                        
                        {/* System Tables */}
                        <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-700">
                            <p className="text-purple-400 font-bold mb-2">// IDENTITY & CONFIGURATION</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-400 mb-1">TABLE users</p>
                                    <ul className="text-emerald-300 space-y-0.5">
                                        <li>uid <span className="text-slate-500">TEXT PK</span></li>
                                        <li>email <span className="text-slate-500">TEXT</span></li>
                                        <li>password <span className="text-slate-500">TEXT (Hashed)</span></li>
                                        <li>role <span className="text-slate-500">TEXT</span></li>
                                        <li>assignedFacilities <span className="text-slate-500">TEXT (JSON Array)</span></li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-slate-400 mb-1">TABLE facilities</p>
                                    <ul className="text-emerald-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>name <span className="text-slate-500">TEXT</span></li>
                                        <li>code <span className="text-slate-500">TEXT</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Operational Tables */}
                        <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-700">
                            <p className="text-blue-400 font-bold mb-2">// OPERATIONS (Tenant Scoped via facilityId)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                
                                <div>
                                    <p className="text-slate-400 mb-1">TABLE appointments</p>
                                    <ul className="text-blue-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>facilityId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>trailerNumber <span className="text-slate-500">TEXT</span></li>
                                        <li>status <span className="text-slate-500">TEXT</span></li>
                                        <li>startTime <span className="text-slate-500">TEXT (ISO)</span></li>
                                        <li>assignedResourceId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>history <span className="text-slate-500">TEXT (JSON)</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="text-slate-400 mb-1">TABLE trailers</p>
                                    <ul className="text-blue-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>facilityId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>number <span className="text-slate-500">TEXT</span></li>
                                        <li>status <span className="text-slate-500">TEXT</span></li>
                                        <li>location <span className="text-slate-500">TEXT FK</span></li>
                                        <li>currentDriverId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>checkInWeight <span className="text-slate-500">REAL</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="text-slate-400 mb-1">TABLE resources</p>
                                    <ul className="text-blue-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>facilityId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>type <span className="text-slate-500">TEXT ('Dock'|'YardSlot')</span></li>
                                        <li>status <span className="text-slate-500">TEXT</span></li>
                                        <li>capacity <span className="text-slate-500">INTEGER</span></li>
                                        <li>operationMode <span className="text-slate-500">TEXT</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="text-slate-400 mb-1">TABLE drivers</p>
                                    <ul className="text-blue-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>facilityId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>name <span className="text-slate-500">TEXT</span></li>
                                        <li>licenseNumber <span className="text-slate-500">TEXT</span></li>
                                        <li>carrierId <span className="text-slate-500">TEXT FK</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="text-slate-400 mb-1">TABLE carriers</p>
                                    <ul className="text-blue-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK</span></li>
                                        <li>facilityId <span className="text-slate-500">TEXT FK</span></li>
                                        <li>name <span className="text-slate-500">TEXT</span></li>
                                        <li>contactEmail <span className="text-slate-500">TEXT</span></li>
                                    </ul>
                                </div>

                                 <div>
                                    <p className="text-slate-400 mb-1">TABLE settings</p>
                                    <ul className="text-orange-300 space-y-0.5">
                                        <li>id <span className="text-slate-500">TEXT PK ('global'|facilityId)</span></li>
                                        <li>data <span className="text-slate-500">TEXT (JSON)</span></li>
                                    </ul>
                                </div>

                            </div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" /> 2. Security & Context
                    </h2>
                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">2.1 Facility Isolation</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        The <code>DataContext</code> implements a global filter based on the currently selected <code>currentFacilityId</code>.
                        Standard users are assigned an array of <code>assignedFacilities</code> in their User Profile.
                        Admin users can context-switch between any facility or view the "Admin Console".
                    </p>
                    <div className="bg-slate-100 dark:bg-white/5 p-3 rounded border-l-4 border-emerald-500 text-xs font-mono mt-2">
                        const appointments = allAppointments.filter(a =&gt; !currentFacilityId || a.facilityId === currentFacilityId);
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-8">
                        <Settings className="w-5 h-5 text-blue-500" /> 3. Algorithms & Logic
                    </h2>
                    
                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">3.1 Smart Dock Allocation</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        The <code>findBestLocation()</code> function (in DataContext) ranks docks based on:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">
                        <li><strong>Hard Constraint:</strong> Status must be 'Available'.</li>
                        <li><strong>Hard Constraint:</strong> Must be 'Dock' type (Appointments cannot be scheduled to Yard Slots).</li>
                        <li><strong>Soft Score:</strong> +10 points if Dock explicitly allows the Carrier.</li>
                        <li><strong>Soft Score:</strong> +5 points if Dock explicitly allows the Trailer Type.</li>
                    </ul>

                    <h3 className="text-lg font-bold mt-4 text-slate-800 dark:text-gray-200">3.2 Metrics Calculation</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                        Efficiency metrics are calculated client-side to allow instant filtering by date range.
                        The logic iterates through appointment <code>history</code> arrays to calculate time diffs between:
                        <br/>
                        <code>GateIn -&gt; CheckedIn</code> (Gate to Dock)
                        <br/>
                        <code>CheckedIn -&gt; Completed</code> (Dock Dwell)
                    </p>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-8">
                        <Workflow className="w-5 h-5 text-orange-500" /> 4. Integration Points
                    </h2>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300">
                        <li><strong>Authentication:</strong> Custom implementation using the <code>users</code> table in Turso. Supports standard email/password login and "Super Admin" bypass for system bootstrapping.</li>
                        <li><strong>Browser APIs:</strong>
                            <ul className="list-disc pl-5 mt-1">
                                <li><code>navigator.mediaDevices</code> for Camera access in Guard Gate.</li>
                                <li><code>localStorage</code> for persisting Driver Login sessions (key: <code>swiftyard_driver</code>) and User Sessions (key: <code>swiftyard_user_uid</code>).</li>
                            </ul>
                        </li>
                        <li><strong>WhatsApp API:</strong> Configured in Settings. Hooks into status changes (e.g., "Alerts" toggle) to send template messages via Meta Cloud API.</li>
                    </ul>
                </div>
            </div>

        </GlassCard>
      </div>
    </div>
  );
};
