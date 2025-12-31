import { useState, useEffect } from 'react';
import { Search, Download, ClipboardList, User, Clock, CheckCircle2, Circle, XCircle, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Visit } from '../lib/database.types';

const getDynamicStatus = (visit: Visit) => {
  // Get current date and time
  const now = new Date();
  const currentTimestamp = now.getTime();
  
  // Parse check-in date and time
  const checkIn = visit.check_in ? new Date(visit.check_in) : null;
  const checkInTimestamp = checkIn ? checkIn.getTime() : null;
  
  // Parse check-out date and time
  const checkOut = visit.check_out ? new Date(visit.check_out) : null;
  const checkOutTimestamp = checkOut ? checkOut.getTime() : null;

  // If visit is denied or cancelled, show that status
  if (visit.status === 'denied') return 'denied';
  if (visit.status === 'cancelled') return 'cancelled';

  // If no check-in time, can't determine status
  if (!checkInTimestamp) return 'upcoming';

  // Completed: current time is at or past check-out time
  if (checkOutTimestamp && currentTimestamp >= checkOutTimestamp) {
    return 'completed';
  }
  
  // Ongoing: current time is at or past check-in (and before check-out or no check-out)
  if (currentTimestamp >= checkInTimestamp) {
    return 'ongoing';
  }
  
  // Upcoming: current time is before check-in
  return 'upcoming';
};

export function VisitLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState<Visit[]>([]);

  useEffect(() => {
    const fetchVisits = async () => {
      // FIX: Fetch all visits, not just approved ones
      const { data, error } = await supabase
        .from('visits')
        .select('*, visitor:visitors(name), host:hosts(name)')
        .in('status', ['approved', 'denied', 'cancelled', 'completed']);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching visits:', error);
        }
      } else {
        const formattedData: Visit[] = data.map((visit) => ({
          id: visit.id,
          visitor_name: visit.visitor?.name || 'Unknown Visitor',
          purpose: visit.purpose,
          host_name: visit.host?.name || 'Unknown Host',
          check_in: visit.check_in_time,
          check_out: visit.check_out_time,
          status: visit.status,
        }));
        setLogs(formattedData);
      }
    };

    fetchVisits();

    const subscription = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          fetchVisits(); // Refetch on change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    // Filter by search term
    const matchesSearch =
      (log.visitor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.host_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Filter by date if dateFilter is set
    if (dateFilter && log.check_in) {
      const logDate = new Date(log.check_in).toISOString().split('T')[0];
      return matchesSearch && logDate === dateFilter;
    }
    
    return matchesSearch;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <ClipboardList className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visit Logs</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            A complete list of all campus visits including check-in and check-out times.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" strokeWidth={2.5} />
            Export
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-1 items-center justify-between mb-4">
          <div className="flex space-x-4 w-full max-w-2xl">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="Search visits"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-48">
              <label htmlFor="dateFilter" className="sr-only">
                Filter by date
              </label>
              <input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                title="Select a date to filter visits"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6"
                      >
                        Visitor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Host</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Check In</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Check Out</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700">
                    {filteredLogs.map((log) => {
                      const dynamicStatus = getDynamicStatus(log);
                      return (
                        <tr key={log.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {log.visitor_name}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">{log.purpose}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">{log.host_name}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {log.check_in ? new Date(log.check_in).toLocaleString() : '-'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {log.check_out ? new Date(log.check_out).toLocaleString() : '-'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ 
                                dynamicStatus === 'completed'
                                  ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 dark:from-emerald-900/50 dark:to-green-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                  : dynamicStatus === 'ongoing'
                                  ? 'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 dark:from-blue-900/50 dark:to-sky-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                                  : dynamicStatus === 'denied'
                                  ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-200 border border-red-300 dark:border-red-800'
                                  : dynamicStatus === 'cancelled'
                                  ? 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/50 dark:to-slate-900/50 dark:text-gray-200 border border-gray-300 dark:border-gray-800'
                                  : 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 dark:from-amber-900/50 dark:to-yellow-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              {dynamicStatus === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : dynamicStatus === 'ongoing' ? (
                                <Circle className="h-3 w-3 animate-pulse" />
                              ) : dynamicStatus === 'denied' ? (
                                <Ban className="h-3 w-3" />
                              ) : dynamicStatus === 'cancelled' ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {dynamicStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
