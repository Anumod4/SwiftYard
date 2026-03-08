import React, { useState, useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { FileText, Code, Printer, Search, Workflow, Users, Truck, Database, Server, Settings, List, Info, AlertCircle, MonitorPlay, Shield } from 'lucide-react';

const HELP_DOCS = [
    {
        id: 'workflow',
        title: 'End-to-End Workflow: Life of an Appointment',
        tab: 'functional',
        tags: ['Gate', 'Appointment', 'Driver Mobile', 'Check-in', 'Check-out', 'Lifecycle', 'Workflow', 'Journey'],
        icon: Workflow,
        content: () => (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400">The lifecycle of an appointment spans across the Carrier App, Yard Management App, and Driver Mobile App.</p>
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-x-auto">
                    <pre className="text-slate-800 dark:text-slate-300">
                        {`1. Carrier App -> Yard App: Booking (Status: PendingApproval)
2. Yard App -> Carrier App: Approval (Status: Scheduled)
   [Driver Assigned to Appointment]
3. Driver Mobile -> Yard App: Arrives at Gate
4. Yard App -> Driver Mobile: Gate-In Processed (Status: GatedIn)
5. Yard App: Assigns Dock or Yard Slot
6. Driver Mobile -> Yard App: Driver Acknowledges Move (Status: MovingToDock or MovingToYard)
7. Driver Mobile -> Yard App: Driver Completes Move (Status: ReadyForCheckIn or InYard)
8. Yard App (Dock): Staff Checks-In (Status: CheckedIn)
9. Yard App (Dock): Loading/Unloading Complete (Status: ReadyForCheckOut)
10. Yard App (Dock): Check-out processed (Status: CheckedOut)
11. Driver Mobile -> Yard App: Driver moves to Gate (Status: Departing)
12. Yard App (Gatehouse) -> Carrier App: Gate-Out Processed (Status: Completed)
`}
                    </pre>
                </div>
            </div>
        )
    },
    {
        id: 'status-appointments',
        title: 'Entity State Machines: Appointment Statuses',
        tab: 'functional',
        tags: ['Status', 'Appointment', 'State Machine', 'Definitions'],
        icon: List,
        content: () => (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <tr>
                            <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-40">Status</th>
                            <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700">Description</th>
                            <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-40">Triggered By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Draft</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Initial creation state before submission.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Carrier App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">PendingApproval</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Booking submitted, awaiting staff review.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Carrier App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Scheduled</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Approved and locked into the calendar.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">GatedIn</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Vehicle has crossed the guard gate.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App (Gatehouse)</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">MovingToDock</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Driver instructed to move to assigned dock.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">ReadyForCheckIn</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Driver arrived at dock, waiting for dock staff.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Driver App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">CheckedIn</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Trailer locked at dock, loading/unloading has begun.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App (Dock)</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">ReadyForCheckOut</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Service complete, awaiting dock release.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App (Dock)</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">CheckedOut</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Released from dock.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App (Dock)</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">MovingToYard</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Instructed to move to a yard parking slot.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">InYard</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Trailer is parked in a yard slot.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Driver/Yard App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Completed</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Final state after successful Gate-Out.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App (Gate)</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Cancelled</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Terminated before gate-in.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Carrier/Yard App</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Rejected</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">Carrier booking request denied.</td><td className="p-2 text-xs text-slate-500 dark:text-gray-500">Yard App</td></tr>
                    </tbody>
                </table>
            </div>
        )
    },
    {
        id: 'status-trailers',
        title: 'Entity State Machines: Trailer Statuses',
        tab: 'functional',
        tags: ['Status', 'Trailer', 'State Machine', 'Definitions'],
        icon: List,
        content: () => (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <tr>
                            <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-40">Status</th>
                            <th className="p-2 border-b border-slate-200 dark:border-slate-700">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Scheduled</td><td className="p-2 text-slate-600 dark:text-gray-400">Expected to arrive based on an upcoming appointment.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">GatedIn</td><td className="p-2 text-slate-600 dark:text-gray-400">On-premises but not yet assigned to a location or moving.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">MovingToDock</td><td className="p-2 text-slate-600 dark:text-gray-400">In transit to an assigned dock door.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">ReadyForCheckIn</td><td className="p-2 text-slate-600 dark:text-gray-400">Waiting at the dock door for staff.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">CheckedIn</td><td className="p-2 text-slate-600 dark:text-gray-400">Actively being serviced at a dock.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">ReadyForCheckOut</td><td className="p-2 text-slate-600 dark:text-gray-400">Service finished, waiting to leave dock.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">CheckedOut</td><td className="p-2 text-slate-600 dark:text-gray-400">Undocked and ready to move.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">MovingToYard</td><td className="p-2 text-slate-600 dark:text-gray-400">In transit to a yard slot.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">InYard</td><td className="p-2 text-slate-600 dark:text-gray-400">Parked in a yard slot.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">GatedOut</td><td className="p-2 text-slate-600 dark:text-gray-400">Has left the facility.</td></tr>
                        <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Unknown</td><td className="p-2 text-slate-600 dark:text-gray-400">Tracked entity lost context.</td></tr>
                    </tbody>
                </table>
            </div>
        )
    },
    {
        id: 'status-drivers',
        title: 'Entity State Machines: Driver & Resource Statuses',
        tab: 'functional',
        tags: ['Status', 'Driver', 'Resource', 'Definitions'],
        icon: Users,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-gray-200 mb-2">Driver Statuses</h4>
                    <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                            <tr>
                                <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-40">Status</th>
                                <th className="p-2 border-b border-slate-200 dark:border-slate-700">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">Away</td><td className="p-2 text-slate-600 dark:text-gray-400">Not currently active or on-site.</td></tr>
                            <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">On Site</td><td className="p-2 text-slate-600 dark:text-gray-400">Checked in through the guard gate, actively handling a trailer.</td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-gray-200 mb-2 mt-4">Resource Statuses (Docks & Yard Slots)</h4>
                    <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                            <tr>
                                <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-40">Status</th>
                                <th className="p-2 border-b border-slate-200 dark:border-slate-700">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">Available</td><td className="p-2 text-slate-600 dark:text-gray-400">Empty and ready to receive a trailer.</td></tr>
                            <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">Occupied</td><td className="p-2 text-slate-600 dark:text-gray-400">Currently holding a checking-in or parked trailer.</td></tr>
                            <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-orange-600 dark:text-orange-400 font-bold">Unavailable</td><td className="p-2 text-slate-600 dark:text-gray-400">Under maintenance or blocked for operations.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    },
    {
        id: 'config-logic',
        title: 'Configuration Logic',
        tab: 'functional',
        tags: ['Settings', 'Gate', 'Auto-Assign', 'Billing / Dwell', 'Carriers', 'Configuration'],
        icon: Settings,
        content: () => (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400">SwiftYard's workflow is heavily influenced by Global System Settings and Entity configurations:</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 space-y-2">
                    <li><strong>Carriers:</strong> Carriers can be assigned default privileges, specific operational hours, and designated access to certain facilities. Billing rules and grace periods (Yard/Dock free hours) are inherited from the carrier profile unless globally overridden.</li>
                    <li><strong>Resources (Docks/Slots):</strong> Docks and slots can be restricted to specific <code>Trailer Types</code> (e.g., Refrigerated docks) or <code>Carriers</code> (e.g., dedicated carrier docks). Auto-assignment logic queries these properties before dispatching a driver.</li>
                    <li><strong>Global Layout Settings:</strong> The <code>Gate-In Flow</code> configuration dictates the default action upon arrival:
                        <ul className="list-disc pl-5 mt-1">
                            <li><strong>YardDefault:</strong> All incoming trailers are directed to a parking yard slot first, delaying dock assignment until ready.</li>
                            <li><strong>DockDirect:</strong> System uniquely attempts to immediately assign an available dock; falling back to a yard slot only if full.</li>
                        </ul>
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: 'sys-interactions',
        title: 'System Interactions (API & Webhooks)',
        tab: 'technical',
        tags: ['API', 'Webhooks', 'Socket', 'Driver Mobile', 'Carrier', 'Yard', 'Gate', 'Sync'],
        icon: Server,
        content: () => (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400">The ecosystem uses an API-first approach with RESTful services and real-time Socket.IO events for cross-platform synchronization between Carrier, Yard, and Driver components.</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 space-y-2">
                    <li><strong>Carrier App -&gt; API:</strong> Submits appointments and queries availability (<code>POST /api/appointments</code>).</li>
                    <li><strong>Yard App &lt;-&gt; API &lt;-&gt; Socket.IO:</strong> The Yard application consumes API endpoints to modify states (e.g., <code>PUT /api/appointments/:id/check-in</code>). Upon success, the backend emits <code>Socket.IO</code> broadcast events (<code>appointment-updated</code> or <code>trailer-updated</code>) to instantly refresh all connected clients.</li>
                    <li><strong>API -&gt; Webhooks:</strong> Important lifecycle events (e.g., <code>Trailer.GatedIn</code>) trigger asynchronous webhook execution (<code>POST /api/webhooks/trigger</code>) to configured external URLs, allowing seamless integration with external ERP/WMS systems.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'data-integrity',
        title: 'Data Integrity & Synchronization',
        tab: 'technical',
        tags: ['Database', 'Sync', 'Driver Mobile', 'Concurrency', 'Validation', 'Race Conditions'],
        icon: Database,
        content: () => (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400">Synchronization and integrity, especially for mid-transit driver updates, are handled through pessimistic state validation and unified DTOs:</p>
                <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 space-y-3">
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">State Transition Validation:</strong> The backend API strictly enforces logical state transitions. A Driver App cannot transition an appointment to <code>ReadyForCheckIn</code> if the appointment is not currently <code>MovingToDock</code>.
                    </li>
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Atomic Updates (Turso/libSQL):</strong> Core updates to Trailer location and Appointment status are executed as atomic transactions. If a conflicting request occurs, it receives a <code>409 Conflict</code> (or invalid state) error, and the UI resyncs.
                    </li>
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Instruction Timestamps:</strong> Every instruction sent to a driver creates an <code>instructionTimestamp</code>. Responses from the mobile app compare this timestamp server-side to ensure the driver is reacting to the most recent command sequence.
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: 'logical-components',
        title: 'Logical Service Components',
        tab: 'technical',
        tags: ['Architecture', 'Layers', 'Auth', 'Context', 'Scheduling', 'Inventory', 'Audit', 'Logging'],
        icon: Code,
        content: () => (
            <div className="space-y-4">
                <ol className="list-decimal pl-5 text-sm text-slate-700 dark:text-gray-300 space-y-3">
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Auth & Context Layer:</strong> Validates and rejects unauthorized API calls. Resolves the user's role and <code>facilityId</code>, invisibly scoping database queries so users only process data within their designated yard.
                    </li>
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Scheduling & Validation Engine:</strong> Calculates appointment overlaps, validates against facility operational hours, and checks cross-carrier resource availability calendars.
                    </li>
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Inventory/Resource Engine:</strong> Tracks real-time states of Docks and Yard Slots, ensuring strict inventory matching constraints (1 physical resource = 1 trailer limit).
                    </li>
                    <li>
                        <strong className="text-slate-800 dark:text-gray-200">Notification & Audit Layer (Activity Logger):</strong> Intercepts critical mutations via the abstracted <code>logActivity</code> system context, writing deep operational traces to <code>activity_logs</code>.
                    </li>
                </ol>
            </div>
        )
    },
    {
        id: 'user-roles',
        title: 'User Roles & Permissions',
        tab: 'functional',
        tags: ['Admin', 'Gatekeeper', 'Driver', 'Roles', 'Permissions'],
        icon: Shield,
        content: () => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong className="block text-slate-900 dark:text-white mb-2">Administrator</strong>
                    <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                        <li>Global System Configuration</li>
                        <li>User & Role Management</li>
                        <li>Facility Creation & Assignment</li>
                        <li>Master Data (Carriers, Types)</li>
                    </ul>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong className="block text-slate-900 dark:text-white mb-2">Gatekeeper / Staff</strong>
                    <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                        <li>Check-in / Check-out Operations</li>
                        <li>Guard Gate Entry Processing</li>
                        <li>Appointment Scheduling</li>
                        <li>Yard Slot Allocation</li>
                    </ul>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong className="block text-slate-900 dark:text-white mb-2">Driver</strong>
                    <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-gray-400 space-y-1">
                        <li>Mobile-only Interface</li>
                        <li>Real-time Job View (Move commands)</li>
                        <li>Dock Confirmation</li>
                        <li>No Menu Access</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'core-modules',
        title: 'Core Operational Modules',
        tab: 'functional',
        tags: ['Appointments', 'Cancelling', 'Smart Scheduling', 'Guard Gate', 'Check-in Weight', 'Dashboard', 'Congestion'],
        icon: Truck,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Appointment Management</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                        The <strong>Appointments</strong> module is the central planning tool.
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2">
                        <li><strong>Cancelling:</strong> Only appointments in <em>Scheduled</em> status can be cancelled.</li>
                        <li><strong>Editing:</strong> Active appointments can be edited. Completed or Departed appointments are locked.</li>
                        <li><strong>Smart Scheduling:</strong> System scores available resources based on allowed constraints.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Guard Gate (Inbound/Outbound)</h3>
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-2 mt-2 text-sm text-slate-700 dark:text-gray-300">
                        <strong>Auto-Fill Logic:</strong> When entering a Trailer Number, the system checks for a scheduled appointment today. If none, it searches registry history.
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Dashboard & Congestion Watch</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2">
                        <li><strong>KPIs:</strong> Tracks Gate-to-Dock, Dock Dwell, and Yard Dwell.</li>
                        <li><strong>Congestion Logic:</strong> Flags trailers if Time in Yard &gt; 4 hours or Time at Dock &gt; 2 hours.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'live-board',
        title: 'Live Board & Dispatch Operations',
        tab: 'functional',
        tags: ['Live Board', 'Dispatcher', 'Mobile App', 'Timer', 'Overdue'],
        icon: MonitorPlay,
        content: () => (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-400">
                    The system features a real-time communication loop between the Dispatcher (Trailers UI), the Driver (Mobile App), and the Yard Monitor (Live Board). This eliminates the need for phone calls or walkie-talkies for routine moves.
                </p>
                <div className="my-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="p-3 text-left">Actor / UI</th>
                                <th className="p-3 text-left">Action & Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-gray-300">
                            <tr>
                                <td className="p-3">Dispatcher <span className="text-xs text-slate-500 block">Trailers UI</span></td>
                                <td className="p-3">Assigns destination. <em>Status changes to 'MovingToDock'. Instruction Timer starts.</em></td>
                            </tr>
                            <tr>
                                <td className="p-3">Driver <span className="text-xs text-slate-500 block">Mobile App</span></td>
                                <td className="p-3">Starts navigation view. <em>Timer shows countdown (if enabled in settings).</em></td>
                            </tr>
                            <tr>
                                <td className="p-3">Yard Staff <span className="text-xs text-slate-500 block">Live Board</span></td>
                                <td className="p-3">Card appears on big screen. <em>If driver takes too long, card turns RED (Overdue).</em></td>
                            </tr>
                            <tr>
                                <td className="p-3">Driver <span className="text-xs text-slate-500 block">Mobile App</span></td>
                                <td className="p-3">Driver arrives at dock and taps Confirm. <em>Status updates to 'ReadyForCheckIn'.</em></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )
    },
    {
        id: 'system-overview',
        title: 'System Overview & Quick Start',
        tab: 'technical',
        tags: ['Setup', 'Installation', 'Features', 'Overview', 'Deployment'],
        icon: Settings,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Tech Stack</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2">
                        <li><strong>Frontend:</strong> React 18, TypeScript, TailwindCSS, Vite.</li>
                        <li><strong>Backend:</strong> Express.js API Server.</li>
                        <li><strong>Database:</strong> Turso (libSQL) cloud database.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Installation & Setup</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-x-auto mt-2 text-slate-800 dark:text-slate-300">
                        <pre>
                            {`# Install dependencies
npm install

# Setup environment variables configuration
cp .env.example .env.local

# Run Development Server (Both Frontend & API)
npm run dev

# Run Production Build
npm run build && npm run server`}
                        </pre>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'api-architecture',
        title: 'API Architecture & Auth Flow',
        tab: 'technical',
        tags: ['Architecture', 'Auth', 'Facility', 'Server', 'JWT'],
        icon: Server,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Client-Server Architecture</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 mb-3">
                        SwiftYard uses a decoupled REST API architecture bridging the React SPA and the SQLite database.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-x-auto text-slate-800 dark:text-slate-300">
                        <pre>
                            {`React SPA -> API Client (services/api.ts) -> Express.js API (Middleware/Auth) -> Turso libSQL DB`}
                        </pre>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Authentication & Facility Context</h3>
                    <ul className="list-decimal pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2 space-y-2">
                        <li>User authenticates via <code>/api/auth/login</code> and receives a JWT Token.</li>
                        <li>Token is attached to all subsequent API calls via the <code>Authorization: Bearer &lt;token&gt;</code> header.</li>
                        <li>To scope data down to a specific yard, the client must include the <code>X-Facility-ID</code> header (e.g., <code>X-Facility-ID: FAC-001</code>).</li>
                        <li>Tokens are validated server-side, enforcing Role-Based Access Control (RBAC).</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'api-reference',
        title: 'API Documentation Reference',
        tab: 'technical',
        tags: ['API', 'Endpoints', 'REST', 'Responses', 'Status Codes'],
        icon: Code,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Standardizing Responses</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-x-auto mt-2 text-slate-800 dark:text-slate-300">
                        <pre>
                            {`// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}`}
                        </pre>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Core REST Endpoints</h3>
                    <div className="overflow-x-auto mt-2">
                        <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                            <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                                <tr>
                                    <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-24">Method</th>
                                    <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-48">Endpoint</th>
                                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">POST</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">/api/auth/login</td><td className="p-2 text-slate-600 dark:text-gray-400 text-xs">Returns JWT session token</td></tr>
                                <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-green-600 dark:text-green-400 font-bold">GET</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">/api/appointments</td><td className="p-2 text-slate-600 dark:text-gray-400 text-xs">List facility appointments</td></tr>
                                <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">POST</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">/api/appointments/:id/checkin</td><td className="p-2 text-slate-600 dark:text-gray-400 text-xs">Dock arrival check-in</td></tr>
                                <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">POST</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">/api/trailers/:id/move-to-yard</td><td className="p-2 text-slate-600 dark:text-gray-400 text-xs">Initiate yard move</td></tr>
                                <tr><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">POST</td><td className="p-2 border-r border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-300">/api/trailers/:id/gateout</td><td className="p-2 text-slate-600 dark:text-gray-400 text-xs">Process exit departure</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'external-integrations',
        title: 'External Integrations & ERP',
        tab: 'technical',
        tags: ['Integration', 'ERP', 'CRM', 'Webhooks', 'TMS'],
        icon: Workflow,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Integration Capabilities</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 mb-3">
                        SwiftYard is built to operate headlessly. You can ingest PO data directly from your Transportation Management System (TMS) or ERP.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs overflow-x-auto text-slate-800 dark:text-slate-300">
                        <pre>
                            {`// Example API Request: Creating Appointment via ERP
await fetch('http://localhost:4000/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${API_TOKEN}\`,
    'X-Facility-ID': 'FAC-001'
  },
  body: JSON.stringify({
    trailerNumber: 'TRL-001',
    trailerType: '40 FT Container',
    driverName: 'John Doe',
    poNumber: 'PO-99432',
    startTime: '2026-03-15T10:00:00Z',
    durationMinutes: 60,
    loadType: 'Inbound'
  })
});`}
                        </pre>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Outbound Webhooks</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                        Use webhooks to push real-time gate and dock events back into your CRM automatically. Available triggers include: <code>appointment.created</code>, <code>appointment.scheduled</code>, <code>trailer.gate_in</code>, and <code>trailer.gate_out</code>.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'database-deployment',
        title: 'Database Schema & Deployment',
        tab: 'technical',
        tags: ['Database', 'Turso', 'Deployment', 'Security', 'Schema', 'libSQL'],
        icon: Database,
        content: () => (
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Underlying Database (Turso libSQL)</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                        The platform's highly resilient storage engine spans across distinct operational entities logically grouped by Facility Context.
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2">
                        <li><strong>Auth/Org Layer:</strong> <code>users</code>, <code>roles</code>, <code>facilities</code>, <code>carriers</code></li>
                        <li><strong>Ops/Lifecycle Layer:</strong>  <code>appointments</code>, <code>trailers</code>, <code>drivers</code></li>
                        <li><strong>Physical Abstraction Layer:</strong> <code>resources</code> (docks/slots), <code>trailer_types</code></li>
                        <li><strong>Config Layer:</strong> <code>settings</code>, <code>webhooks</code></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-gray-200">Production Deployment Security</h3>
                    <ul className="list-decimal pl-5 text-sm text-slate-700 dark:text-gray-300 mt-2 space-y-1">
                        <li>Strictly isolate <code>JWT_SECRET</code> values away from client-side builds.</li>
                        <li>Configure Cross-Origin Resource Sharing (CORS) explicitly for domains requesting the <code>/api</code> boundaries.</li>
                        <li>Enforce password hashing with bcrypt on user ingest (handled inside <code>server/routes/auth</code>).</li>
                    </ul>
                </div>
            </div>
        )
    }
];

export const HelpDocs: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'functional' | 'technical'>('functional');
    const [searchTerm, setSearchTerm] = useState('');

    const handlePrint = () => {
        window.print();
    };

    const filteredDocs = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let docsToFilter = HELP_DOCS;

        // If there is no search term, filter by the active tab
        if (!searchTerm) {
            docsToFilter = HELP_DOCS.filter(d => d.tab === activeTab);
        }

        if (!searchTerm) return docsToFilter;

        // If there is a search term, search across ALL documentation regardless of tab
        return HELP_DOCS.filter(doc => {
            const matchesTitle = doc.title.toLowerCase().includes(lowerSearch);
            const matchesTags = doc.tags.some(tag => tag.toLowerCase().includes(lowerSearch));
            return matchesTitle || matchesTags;
        });
    }, [activeTab, searchTerm]);

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header - Hidden in Print Mode */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 print:hidden gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Help & Documentation</h1>
                    <p className="text-slate-500 dark:text-gray-400">Standard Operating Procedures, Searchable Workflows, & Architecture.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handlePrint}
                        className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-6 py-2 rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Global Search and Navigation */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 print:hidden">
                <div className="relative flex-1 max-w-xl group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search documentation (e.g., 'Gate', 'Driver Mobile', 'Billing')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-[#1e1e1e] border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white outline-none shadow-sm transition-all"
                    />
                </div>
                {!searchTerm && (
                    <div className="bg-slate-200 dark:bg-white/10 p-1.5 rounded-xl flex gap-1">
                        <button
                            onClick={() => setActiveTab('functional')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'functional' ? 'bg-white dark:bg-[#121212] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <FileText className="w-4 h-4" /> Functional Reference
                        </button>
                        <button
                            onClick={() => setActiveTab('technical')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'technical' ? 'bg-white dark:bg-[#121212] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Code className="w-4 h-4" /> Technical Architecture
                        </button>
                    </div>
                )}
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible pb-12">
                {filteredDocs.length === 0 ? (
                    <div className="text-center p-16 bg-white dark:bg-[#1e1e1e] rounded-3xl border border-slate-200 dark:border-slate-800">
                        <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No comprehensive results found</h3>
                        <p className="text-slate-500 dark:text-gray-400 max-w-md mx-auto">Try adjusting your search terms or keywords. Keywords like "Gate", "Mobile", or "Status" yield the best results.</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 text-blue-500 font-bold hover:underline"
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredDocs.map(doc => {
                            const Icon = doc.icon;
                            return (
                                <GlassCard key={doc.id} className="p-8 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0 print:mb-12 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/80 print:border-b-2 print:border-black">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3.5 rounded-2xl shrink-0 ${doc.tab === 'functional' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800'}`}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight print:text-black">{doc.title}</h2>
                                                <p className="text-sm font-semibold mt-1 uppercase tracking-widest text-slate-400 dark:text-slate-500 print:hidden">{doc.tab} Module</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-gray-300 text-[15px] leading-relaxed">
                                        {doc.content()}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 print:hidden items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Tags:</span>
                                        {doc.tags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => setSearchTerm(tag)}
                                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 text-xs rounded-md font-medium transition-colors"
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
