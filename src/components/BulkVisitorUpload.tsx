import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import Papa from 'papaparse';

type BulkUploadFormData = {
  file: FileList;
  hostEmail: string;
};

export function BulkVisitorUpload() {
  const { user } = useAuthStore();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<BulkUploadFormData>();
  const [uploading, setUploading] = useState(false);

  // Pre-fill host email if the current user is a host
  useState(() => {
    if (user?.role === 'host' && user.email) {
      setValue('hostEmail', user.email);
    }
  });

  const processCsv = async (file: File): Promise<{[key: string]: string}[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as {[key: string]: string}[]),
        error: (error) => reject(error),
      });
    });
  };

  const onSubmit = async (formData: BulkUploadFormData) => {
    setUploading(true);
    try {
      if (!user) {
        throw new Error('You must be logged in to upload visitors.');
      }

      const file = formData.file[0];
      if (!file) {
        throw new Error('Please select a file to upload.');
      }

      if (!formData.hostEmail) {
        throw new Error('Host email is required.');
      }

      // Resolve the host ID from the provided host email
      const { data: targetHost, error: targetHostError } = await supabase
        .from('hosts')
        .select('id')
        .eq('email', formData.hostEmail)
        .single();

      if (targetHostError || !targetHost) {
        throw new Error(`Host not found with email: ${formData.hostEmail}`);
      }

      const visitors = await processCsv(file);

      if (visitors.length === 0) {
        toast.error('The CSV file is empty or invalid.');
        setUploading(false);
        return;
      }

      const newVisitorsData: { name: string; email: string; phone: string; }[] = [];
      const existingVisitorEmails: string[] = [];

      visitors.forEach((visitor: {[key: string]: string}) => {
        if (visitor.email) {
          existingVisitorEmails.push(visitor.email);
        }
      });

      const { data: existingVisitors, error: existingVisitorsError } = await supabase
        .from('visitors')
        .select('id, email')
        .in('email', existingVisitorEmails);
      
      
      if (existingVisitorsError) throw existingVisitorsError;

      const existingVisitorsMap = new Map(existingVisitors?.map(v => [v.email, v.id]));

      const visitsToInsert: ({ visitor_id: string | undefined; host_id: string; purpose: string; status: string; valid_until: string; })[] = [];

      for (const visitorData of visitors) {
        const visitorId: string | undefined = existingVisitorsMap.get(visitorData.email);

        if (!visitorId) {
          newVisitorsData.push({
            name: visitorData.name,
            email: visitorData.email,
            phone: visitorData.phone || 'N/A',
          });
        }

        visitsToInsert.push({
          visitor_id: visitorId, // Temporary, will be updated after new visitors are inserted
          host_id: targetHost.id,
          purpose: visitorData.purpose || 'N/A',
          status: 'pending',
          valid_until: visitorData.valid_until ? new Date(visitorData.valid_until).toISOString() : new Date().toISOString(),
        });
      }

      // Insert new visitors
      if (newVisitorsData.length > 0) {
        const { data: insertedVisitors, error: insertVisitorsError } = await supabase
          .from('visitors')
          .insert(newVisitorsData)
          .select('id, email');

        if (insertVisitorsError) throw insertVisitorsError;

        insertedVisitors?.forEach(v => existingVisitorsMap.set(v.email, v.id));
      }

      // Update visitor_id for visitsToInsert
      visitsToInsert.forEach(visit => {
        if (!visit.visitor_id) {
          const originalVisitorData = visitors.find((v: {[key: string]: string}) => v.email === visit.email);
          if (originalVisitorData) {
            visit.visitor_id = existingVisitorsMap.get(originalVisitorData.email);
          }
        }
      });

      // Insert all visits in a batch
      const { error: visitsError } = await supabase.from('visits').insert(visitsToInsert);

      if (visitsError) {
        throw visitsError;
      }

      toast.success(`${visitors.length} visitors uploaded successfully!`);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to upload visitors.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <FileSpreadsheet className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Visitor Upload</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Upload multiple visitors at once using a CSV file
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow sm:rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 sm:p-6 space-y-6">
            <div>
              <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Host Email</label>
              <input
                type="email"
                id="hostEmail"
                {...register('hostEmail', { required: 'Host email is required' })}
                disabled={user?.role === 'host'}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-700"
              />
              {errors.hostEmail && <p className="mt-1 text-sm text-red-600">{errors.hostEmail.message}</p>}
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-slate-300">CSV File</label>
              <input
                type="file"
                id="file"
                accept=".csv"
                {...register('file', { required: 'Please select a CSV file' })}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:text-slate-400 dark:file:bg-orange-900/30 dark:file:text-orange-300 dark:hover:file:bg-orange-900/50"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || uploading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Upload className="h-4 w-4" strokeWidth={2.5} />
                {uploading ? 'Uploading...' : 'Upload Visitors'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100">CSV File Format</h3>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">Your CSV file should have the following columns:</p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-700 dark:text-slate-300 space-y-1">
            <li>`name` (required)</li>
            <li>`email` (required)</li>
            <li>`phone` (optional)</li>
            <li>`purpose` (optional, defaults to 'N/A')</li>
            <li>`valid_until` (optional, defaults to now)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}