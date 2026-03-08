import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GlassCard } from '../components/ui/GlassCard';
import { FileText, Download, Filter, Search, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Trailer, Carrier } from '../types';
import { format, differenceInMinutes } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';

interface BillingRecord {
    trailerId: string;
    trailerNumber: string;
    carrierName: string;
    carrierId?: string;
    status: string;
    arrivalTime: Date;
    totalYardHours: number;
    totalDockHours: number;
    freeYardHours: number;
    freeDockHours: number;
    yardPenalty: number;
    dockPenalty: number;
    totalDue: number;
}

export const Billing: React.FC = () => {
    const { trailers, carriers, settings, t, addToast, formatCurrency, formatDateTime } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCarrier, setSelectedCarrier] = useState<string>('ALL');

    const generateBillingRecords = (): BillingRecord[] => {
        return trailers
            .filter(t => ['GatedIn', 'MovingToDock', 'ReadyForCheckIn', 'CheckedIn', 'ReadyForCheckOut', 'MovingToYard', 'InYard'].includes(t.status))
            .map(trailer => {
                const carrier = carriers.find(c => c.id === trailer.carrierId);
                const carrierName = carrier?.name || 'Unknown Carrier';

                // Get Billing Rules (Carrier Override or System Default)
                const freeYardHours = carrier?.billingOverrides?.freeYardHours ?? settings.defaultBillingRules?.freeYardHours ?? 48;
                const freeDockHours = carrier?.billingOverrides?.freeDockHours ?? settings.defaultBillingRules?.freeDockHours ?? 2;
                const yardRatePerDay = carrier?.billingOverrides?.yardRatePerDay ?? settings.defaultBillingRules?.yardRatePerDay ?? 50;
                const dockRatePerHour = carrier?.billingOverrides?.dockRatePerHour ?? settings.defaultBillingRules?.dockRatePerHour ?? 100;

                // Calculate time spent
                // For simplicity, we assume arrival is GatedIn timestamp
                const gatedInEvent = trailer.history.find(h => h.status === 'GatedIn') || trailer.history[0];
                const arrivalTime = gatedInEvent ? new Date(gatedInEvent.timestamp) : new Date();

                // Calculate current dock time if CheckedIn
                let totalDockMinutes = 0;
                const checkedInEvent = trailer.history.find(h => h.status === 'CheckedIn');
                if (checkedInEvent) {
                    const checkOutEvent = trailer.history.find(h => h.status === 'ReadyForCheckOut');
                    const endTime = checkOutEvent ? new Date(checkOutEvent.timestamp) : new Date();
                    totalDockMinutes = differenceInMinutes(endTime, new Date(checkedInEvent.timestamp));
                }
                const totalDockHours = totalDockMinutes / 60;

                // Calculate total yard time
                // Total time since arrival minus dock time
                const totalMinutesSinceArrival = differenceInMinutes(new Date(), arrivalTime);
                const totalYardHours = Math.max(0, (totalMinutesSinceArrival - totalDockMinutes) / 60);

                // Calculate Penalties
                const billableYardHours = Math.max(0, totalYardHours - freeYardHours);
                const billableYardDays = Math.ceil(billableYardHours / 24);
                const yardPenalty = billableYardDays * yardRatePerDay;

                const billableDockHours = Math.max(0, totalDockHours - freeDockHours);
                const dockPenalty = billableDockHours * dockRatePerHour;

                return {
                    trailerId: trailer.id,
                    trailerNumber: trailer.number,
                    carrierName,
                    carrierId: trailer.carrierId,
                    status: trailer.status,
                    arrivalTime,
                    totalYardHours,
                    totalDockHours,
                    freeYardHours,
                    freeDockHours,
                    yardPenalty,
                    dockPenalty,
                    totalDue: yardPenalty + dockPenalty
                };
            })
            // Only show trailers that have been around longer than an hour or have penalties
            .filter(r => r.totalYardHours > 1 || r.totalDue > 0)
            .sort((a, b) => b.totalDue - a.totalDue);
    };

    const records = useMemo(() => generateBillingRecords(), [trailers, carriers, settings]);

    const filteredRecords = records.filter(r => {
        const matchesSearch = r.trailerNumber.toLowerCase().includes(searchTerm.toLowerCase()) || r.carrierName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCarrier = selectedCarrier === 'ALL' || r.carrierId === selectedCarrier;
        return matchesSearch && matchesCarrier;
    });

    const totalPenalties = filteredRecords.reduce((sum, r) => sum + r.totalDue, 0);

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            const dateStr = format(new Date(), 'MMM dd, yyyy HH:mm');

            doc.setFontSize(20);
            doc.text(`${settings.yardName || 'SwiftYard'} - Billing Ledger`, 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generated: ${dateStr}`, 14, 30);

            if (selectedCarrier !== 'ALL') {
                const carrierName = carriers.find(c => c.id === selectedCarrier)?.name || 'Unknown';
                doc.text(`Filtered by Carrier: ${carrierName}`, 14, 36);
            }

            const tableColumn = ["Trailer", "Carrier", "Arrival", "Yard Hrs", "Dock Hrs", "Penalties"];
            const tableRows = filteredRecords.map(r => [
                r.trailerNumber,
                r.carrierName,
                formatDateTime(r.arrivalTime.toISOString()).replace(/,?\s+/g, ' '),
                r.totalYardHours.toFixed(1),
                r.totalDockHours.toFixed(1),
                formatCurrency(r.totalDue)
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 42,
                theme: 'grid',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [10, 132, 255] } // SwiftYard Blue
            });

            // Summary
            const finalY = (doc as any).lastAutoTable.finalY || 42;
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(`Total Accrued Penalties: ${formatCurrency(totalPenalties)}`, 14, finalY + 15);

            doc.save(`swiftyard-billing-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            addToast('Export Complete', 'PDF Ledger downloaded successfully.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Export Failed', 'Unable to generate PDF.', 'error');
        }
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Billing & Ledgers</h1>
                    <p className="text-slate-500 dark:text-gray-400">Track and export detention and demurrage penalties.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search trailer or carrier..."
                            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <select
                        value={selectedCarrier}
                        onChange={(e) => setSelectedCarrier(e.target.value)}
                        className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="ALL">All Carriers</option>
                        {carriers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleExportPDF}
                        disabled={filteredRecords.length === 0}
                        className="bg-[#3B82F6] hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-6 py-2 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all font-medium whitespace-nowrap"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <GlassCard className="p-6 relative overflow-hidden">

                    <h3 className="text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Total Accrued Penalties</h3>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPenalties)}</div>
                    <div className="text-xs text-red-500 mt-2 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> Active Overage Risk</div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Trailers at Risk</h3>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{filteredRecords.filter(r => r.totalDue > 0).length}</div>
                    <div className="text-xs text-slate-500 mt-2">Currently incurring charges</div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Global Free Time</h3>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{settings.defaultBillingRules?.freeYardHours || 48}h Yard</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{settings.defaultBillingRules?.freeDockHours || 2}h Dock</div>
                </GlassCard>
            </div>

            <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-white/10">
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider">Trailer</th>
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider">Carrier</th>
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider">Arrival Time</th>
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Yard Hrs</th>
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Dock Hrs</th>
                                <th className="p-4 text-xs font-black uppercase text-slate-400 tracking-wider text-right">Penalties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredRecords.map((record) => (
                                <tr key={record.trailerId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{record.trailerNumber}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{record.status}</div>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-gray-300">
                                        {record.carrierName}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-gray-400">
                                        {formatDateTime(record.arrivalTime.toISOString())}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className={`font-mono text-sm ${record.totalYardHours > record.freeYardHours ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-gray-400'}`}>
                                            {record.totalYardHours.toFixed(1)} / {record.freeYardHours}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className={`font-mono text-sm ${record.totalDockHours > record.freeDockHours ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-gray-400'}`}>
                                            {record.totalDockHours.toFixed(1)} / {record.freeDockHours}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {record.totalDue > 0 ? (
                                            <div className="font-mono text-base font-black text-red-500">
                                                {formatCurrency(record.totalDue)}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end text-green-500">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        No active billing records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};
