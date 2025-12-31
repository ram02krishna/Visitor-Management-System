import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { v4 as uuidv4 } from 'uuid';
import { Camera, UserPlus } from 'lucide-react';

type PreRegisterFormData = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  visitDate: string;
  checkInTime: string;
  hostEmail: string;
  photo?: FileList;
};

export function PreRegisterVisitor() {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PreRegisterFormData>();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill host email if the current user is a host
  useState(() => {
    if (user?.role === 'host' && user.email) {
      setValue('hostEmail', user.email);
    }
  });

  const onSubmit = async (formData: PreRegisterFormData) => {
    console.log('[PreRegisterVisitor] Form submission started');
    console.log('[PreRegisterVisitor] Form data:', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      purpose: formData.purpose,
      hostEmail: formData.hostEmail,
      visitDate: formData.visitDate,
      checkInTime: formData.checkInTime,
      hasPhoto: formData.photo ? formData.photo.length > 0 : false
    });
    
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      if (!user) {
        throw new Error('You must be logged in to pre-register a visitor.');
      }

      console.log('[PreRegisterVisitor] User authenticated:', user.id);

      // Resolve the host ID from the provided host email
      console.log('[PreRegisterVisitor] Looking up host with email:', formData.hostEmail);
      const { data: targetHost, error: targetHostError } = await supabase
        .from('hosts')
        .select('id')
        .eq('email', formData.hostEmail)
        .maybeSingle();

      if (targetHostError) {
        console.error('[PreRegisterVisitor] Host lookup error:', targetHostError);
        throw targetHostError;
      }

      if (!targetHost) {
        throw new Error(`Host not found with email: ${formData.hostEmail}`);
      }

      console.log('[PreRegisterVisitor] Host found:', targetHost.id);

      // 1. Create or find the visitor
      console.log('[PreRegisterVisitor] Checking for existing visitor with email:', formData.email);
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (visitorError) {
        console.error('[PreRegisterVisitor] Visitor lookup error:', visitorError);
        throw visitorError;
      }

      let visitorId: string;

      if (!visitor) {
        console.log('[PreRegisterVisitor] Creating new visitor...');
        const { data: newVisitor, error: newVisitorError } = await supabase
          .from('visitors')
          .insert({ name: formData.name, email: formData.email, phone: formData.phone || 'N/A' })
          .select('id')
          .single();

        if (newVisitorError) {
          console.error('[PreRegisterVisitor] Visitor creation error:', newVisitorError);
          throw newVisitorError;
        }
        visitorId = newVisitor.id;
        console.log('[PreRegisterVisitor] New visitor created:', visitorId);
      } else {
        visitorId = visitor.id;
        console.log('[PreRegisterVisitor] Existing visitor found:', visitorId);
      }

      // 2. Upload photo if provided
      if (formData.photo && formData.photo.length > 0) {
        console.log('[PreRegisterVisitor] Uploading visitor photo...');
        const file = formData.photo[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `visitor_photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('visitor-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('[PreRegisterVisitor] Photo upload error:', uploadError);
          // Continue with the process even if photo upload fails
        } else {
          console.log('[PreRegisterVisitor] Photo uploaded successfully');
        }
      }

      // Combine visitDate and checkInTime to form valid_until
      const [year, month, day] = formData.visitDate.split('-').map(Number);
      const [hours, minutes] = formData.checkInTime.split(':').map(Number);
      const validUntilDateTime = new Date(year, month - 1, day, hours, minutes);

      // 3. Create the visit
      const visitId = uuidv4();
      console.log('[PreRegisterVisitor] Creating visit record with ID:', visitId);
      
      const { error: visitError } = await supabase.from('visits').insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: targetHost.id,
        purpose: formData.purpose,
        status: 'pending',
        valid_until: validUntilDateTime.toISOString(),
      });

      if (visitError) {
        console.error('[PreRegisterVisitor] Visit creation error:', visitError);
        throw visitError;
      }

      console.log('[PreRegisterVisitor] Visit record created successfully');

      // 4. Generate QR code
      console.log('[PreRegisterVisitor] Generating QR code...');
      const qrData = JSON.stringify({ visitId });
      const qrCodeUrl = await QRCode.toDataURL(qrData);
      console.log('[PreRegisterVisitor] QR code generated successfully');

      // 5. Send invitation email using EmailJS with environment variables
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!emailServiceId || !emailTemplateId || !emailPublicKey) {
        console.warn('[PreRegisterVisitor] EmailJS credentials not configured. Skipping email notification.');
        setSuccessMessage('Visitor pre-registered successfully! However, email configuration is missing.');
        toast('Visitor pre-registered, but email is not configured.', {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
          },
        });
      } else {
        try {
          console.log('[PreRegisterVisitor] Sending email to:', formData.email);
          
          const emailParams = {
            to_name: formData.name,
            to_email: formData.email,
            email: formData.email, // Alternative naming
            name: formData.name, // Alternative naming
            qr_code: qrCodeUrl,
            visit_id: visitId,
            visit_purpose: formData.purpose,
            purpose: formData.purpose, // Alternative naming
            host_name: user.name || 'Host',
            host_email: formData.hostEmail,
            valid_until: validUntilDateTime.toLocaleString(),
          };
          
          console.log('[PreRegisterVisitor] Email parameters:', emailParams);
          
          const emailResult = await emailjs.send(
            emailServiceId,
            emailTemplateId,
            emailParams,
            emailPublicKey
          );

          console.log('[PreRegisterVisitor] Email send result:', emailResult);
          
          if (emailResult.status === 200) {
            setSuccessMessage('Visitor pre-registered successfully! An invitation has been sent.');
            toast.success('Visitor pre-registered and email sent successfully!');
            console.log('[PreRegisterVisitor] Email sent successfully');
          } else {
            setSuccessMessage('Visitor pre-registered successfully! However, email sending may have failed.');
            toast('Visitor pre-registered, but email sending had issues.', {
              icon: '⚠️',
              style: {
                background: '#FEF3C7',
                color: '#92400E',
              },
            });
            console.warn('[PreRegisterVisitor] Email sending failed with status:', emailResult.status);
          }
        } catch (emailError) {
          console.error('[PreRegisterVisitor] Email sending error:', emailError);
          setSuccessMessage('Visitor pre-registered successfully! However, the email could not be sent.');
          toast('Visitor pre-registered, but email failed to send.', {
            icon: '⚠️',
            style: {
              background: '#FEF3C7',
              color: '#92400E',
            },
          });
        }
      }

      console.log('[PreRegisterVisitor] Registration completed successfully');
      reset();
    } catch (error: unknown) {
      console.error('[PreRegisterVisitor] Pre-registration error:', error);
      setErrorMessage((error as Error).message || 'Failed to pre-register visitor.');
      toast.error((error as Error).message || 'Failed to pre-register visitor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <UserPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pre-register Visitor</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Pre-register a visitor by providing their details. An email with a QR code will be sent to them.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="md:grid md:grid-cols-1 md:gap-6">
          <div className="mt-5 md:mt-0">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="shadow sm:rounded-md sm:overflow-hidden">
                <div className="px-4 py-5 bg-white dark:bg-slate-900 space-y-6 sm:p-6">
                  {successMessage && (
                    <div className="rounded-md bg-green-50 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                            {successMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="rounded-md bg-red-50 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800">
                            {errorMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Visitor Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        {...register('name', { required: 'Visitor name is required' })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Visitor Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        {...register('email', { required: 'Visitor email is required' })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Visitor Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        {...register('phone')}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Purpose of Visit
                      </label>
                      <input
                        type="text"
                        id="purpose"
                        {...register('purpose', { required: 'Purpose of visit is required' })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date of Visit
                      </label>
                      <input
                        type="date"
                        id="visitDate"
                        {...register('visitDate', { required: 'Date of visit is required' })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.visitDate && <p className="mt-1 text-sm text-red-600">{errors.visitDate.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="checkInTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Check-in Time
                      </label>
                      <input
                        type="time"
                        id="checkInTime"
                        {...register('checkInTime', { required: 'Check-in time is required' })}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      {errors.checkInTime && <p className="mt-1 text-sm text-red-600">{errors.checkInTime.message}</p>}
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Host Email
                      </label>
                      <input
                        type="email"
                        id="hostEmail"
                        {...register('hostEmail', { required: 'Host email is required' })}
                        disabled={user?.role === 'host'}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-700"
                      />
                      {errors.hostEmail && <p className="mt-1 text-sm text-red-600">{errors.hostEmail.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visitor Photo</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="photo"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span>Upload a file</span>
                            <input 
                              id="photo" 
                              type="file" 
                              accept="image/*"
                              {...register('photo')}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 text-right sm:px-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={2.5} />
                    {loading || isSubmitting ? 'Sending Invitation...' : 'Pre-register Visitor'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
