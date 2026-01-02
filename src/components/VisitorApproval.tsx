import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';

type Visit = Database['public']['Tables']['visits']['Row'] & {
  visitors: Database['public']['Tables']['visitors']['Row'];
};

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export function VisitorApproval() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const loadVisits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('visits')
        .select('*, visitors(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`visitors.name.ilike.%${debouncedSearchTerm}%,visitors.email.ilike.%${debouncedSearchTerm}%,purpose.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      setVisits(data as Visit[]);
    } catch (error) {
      toast.error('Failed to load pending visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [debouncedSearchTerm]);

  const handleApproval = async (visitId: string, approved: boolean) => {
    try {
      const { data: updatedData, error } = await supabase
        .from('visits')
        .update({
          status: approved ? 'approved' : 'denied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitId)
        .select('*, visitors(*)')
        .single();

      if (error) {
        throw error;
      }

      toast.success(`Visit ${approved ? 'approved' : 'denied'} successfully`);

      if (approved && updatedData) {
        const qrData = JSON.stringify({
          visitId: updatedData.id,
          name: updatedData.visitors.name,
          email: updatedData.visitors.email,
          purpose: updatedData.purpose,
          validUntil: updatedData.valid_until,
        });

        const qrUrl = await QRCode.toDataURL(qrData);

        try {
          await emailjs.send(
            "service_tmagvgd",
            "template_c4a4dpu",
            {
              to_name: updatedData.visitors.name,
              to_email: updatedData.visitors.email,
              qr_code: qrUrl,
              visit_id: updatedData.id,
              visit_purpose: updatedData.purpose,
              valid_until: new Date(updatedData.valid_until).toLocaleString(),
            },
            "ApAlChy6Mq77wiEue"
          );
          toast.success('Approval email sent successfully!');
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }

      loadVisits();
    } catch (error) {
      toast.error('Failed to update visit status');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="sm:flex sm:items-center animate-fadeInUp">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">Pending Visits</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Review and approve pending visitor requests
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-1 items-center justify-between mb-4">
          <div className="w-full max-w-lg lg:max-w-xs">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-10 pr-3 leading-5 placeholder-gray-500 dark:placeholder-gray-400 focus:border-sky-500 focus:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm text-gray-900 dark:text-white transition-all duration-300 hover:border-sky-400"
                placeholder="Search visits"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow-xl ring-1 ring-black ring-opacity-5 md:rounded-2xl hover:shadow-2xl transition-all duration-500">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                        Visitor
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Purpose
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Valid Until
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Requested At
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">Loading pending visits...</td>
                      </tr>
                    ) : visits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">No pending visits found.</td>
                      </tr>
                    ) : (
                      visits.map((visit, index) => (
                      <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 animate-fadeInUp" style={{animationDelay: `${index * 0.05}s`}}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900 dark:text-white">{visit.visitors.name}</div>
                          <div className="text-gray-500 dark:text-gray-300">{visit.visitors.email}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {visit.purpose}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {format(new Date(visit.valid_until), 'PPp')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {format(new Date(visit.created_at), 'PPp')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleApproval(visit.id, true)}
                            className="inline-flex items-center justify-center p-2 text-green-600 dark:text-green-400 hover:text-white hover:bg-green-600 dark:hover:bg-green-500 rounded-lg mr-2 transition-all duration-300"
                            title="Approve Visit"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApproval(visit.id, false)}
                            className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 rounded-lg transition-all duration-300"
                            title="Deny Visit"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    )))}
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
