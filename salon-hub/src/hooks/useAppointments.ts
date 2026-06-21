import { useState, useEffect, useCallback, useRef } from 'react';
import { appointmentService, type Appointment as ApiAppointment } from '@/services/appointmentService';
import { staffService, type Staff as ApiStaff } from '@/services/staffService';
import { websocketService } from '@/services/websocketService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';

// Frontend appointment type (compatible with AppointmentBlock)
export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  startTime: string;
  endTime: string;
  staffId: string;
  staffName?: string;
  color: string;
  date: Date;
  apiId?: number; // For API operations
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  price?: number;
}

// Frontend staff type
export interface Staff {
  id: string;
  name: string;
  avatar: string;
  initials?: string;
  workingHours?: string;
}

// Convert API appointment to frontend format
const convertAppointment = (apiAppt: ApiAppointment, date: Date): Appointment => {
  return {
    id: apiAppt.id.toString(),
    clientName: apiAppt.clientName || 'Walk In Client',
    service: apiAppt.serviceName || 'Service',
    startTime: apiAppt.startTime,
    endTime: apiAppt.endTime,
    staffId: apiAppt.staffId.toString(),
    staffName: apiAppt.staffName,
    color: apiAppt.color || 'green',
    date: date,
    apiId: apiAppt.id,
    // Additional fields
    clientPhone: apiAppt.clientPhone,
    clientEmail: apiAppt.clientEmail,
    notes: apiAppt.notes,
    price: apiAppt.price,
  };
};

// Convert API staff to frontend format
const convertStaff = (apiStaff: ApiStaff): Staff => {
  return {
    id: apiStaff.id.toString(),
    name: apiStaff.name,
    avatar: apiStaff.avatarUrl || '',
    initials: apiStaff.initials,
    workingHours: apiStaff.workingHours,
  };
};

export function useAppointments(businessIdParam?: number, date?: Date) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [websocketStatus, setWebsocketStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const seenAppointmentIdsRef = useRef<Set<number>>(new Set());
  const currentDateRef = useRef<Date>(date || new Date());
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioWarningLoggedRef = useRef(false);
  const fallbackAudioContextRef = useRef<AudioContext | null>(null);

  const playIncomingBookingSound = useCallback(() => {
    if (typeof window === 'undefined') return;

    const playFallbackBeep = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!fallbackAudioContextRef.current) {
          fallbackAudioContextRef.current = new AudioCtx();
        }
        const context = fallbackAudioContextRef.current;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(950, context.currentTime);
        gainNode.gain.setValueAtTime(0.0001, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.4);
      } catch (beepError) {
        if (!audioWarningLoggedRef.current) {
          console.warn('Fallback booking beep failed:', beepError);
          audioWarningLoggedRef.current = true;
        }
      }
    };

    if (!notificationAudioRef.current) {
      // Served app asset for reliable browser playback.
      notificationAudioRef.current = new Audio('/sounds/manager-booking-alert.mp3');
      notificationAudioRef.current.preload = 'auto';
    }

    const audio = notificationAudioRef.current;
    audio.currentTime = 0;
    audio.play().catch((error) => {
      if (!audioWarningLoggedRef.current) {
        console.warn('Booking notification sound could not be played:', error);
      }
      playFallbackBeep();
    });
  }, []);

  const loadAppointments = useCallback(async (targetDate: Date) => {
    if (!businessId) {
      setError('Business ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [appointmentsData, staffData] = await Promise.all([
        appointmentService.getAppointmentsByBusiness(businessId, targetDate),
        staffService.getStaffByBusiness(businessId),
      ]);

      // Convert appointments and filter out cancelled ones
      const convertedAppointments = appointmentsData
        .filter(apt => apt.status !== 'CANCELLED')
        .map(apt => {
          const appointmentDate = parse(apt.appointmentDate, 'yyyy-MM-dd', new Date());
          return convertAppointment(apt, appointmentDate);
        });

      // Convert staff
      const convertedStaff = staffData.map(convertStaff);
      seenAppointmentIdsRef.current = new Set(convertedAppointments.map((apt) => apt.apiId).filter((id): id is number => typeof id === 'number'));

      setAppointments(convertedAppointments);
      setStaff(convertedStaff);
      
      console.log(`✅ Loaded ${convertedAppointments.length} appointments for ${format(targetDate, 'yyyy-MM-dd')}`);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load appointments';
      console.error('Failed to load appointments:', err);
      setError(errorMessage);
      
      // Only show toast if it's a critical error (not just empty results)
      if (err.response?.status !== 404 && !errorMessage.includes('404')) {
        toast.error(errorMessage);
      }
      
      // Set empty arrays on error to prevent UI crashes
      setAppointments([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    const targetDate = date || new Date();
    loadAppointments(targetDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, businessId]); // Only depend on date and businessId to avoid infinite loop

  // WebSocket subscription for real-time updates
  useEffect(() => {
    console.log(`🔌 [useAppointments] WebSocket useEffect triggered - businessId: ${businessId}, date: ${date}`);
    
    if (!businessId) {
      console.warn('⚠️ [useAppointments] No businessId, skipping WebSocket setup');
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;
    const currentDate = date || new Date();
    currentDateRef.current = currentDate;
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    console.log(`📅 [useAppointments] Setting up WebSocket for date: ${currentDateStr}`);

    const setupWebSocket = async () => {
      try {
        // Small delay: let the page finish its initial render before opening a
        // WebSocket. Without this, fast navigation or React StrictMode double-invoke
        // causes the cleanup to run while SockJS is mid-handshake →
        // "WebSocket is closed before the connection is established".
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!isMounted) return;

        // Wait for WebSocket libraries to load
        let retries = 0;
        const maxRetries = 20;
        while (!(window as any).SockJS || !(window as any).Stomp) {
          if (!isMounted) return; // abort if unmounted while waiting
          if (retries >= maxRetries) {
            console.warn('[useAppointments] WebSocket libraries not loaded — real-time updates disabled');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!isMounted) return;
        setWebsocketStatus('connecting');
        await websocketService.connect();

        // Critical: check mount status immediately after the async connect.
        // If the component unmounted during the SockJS handshake, disconnect
        // cleanly and bail — otherwise we'd subscribe to a zombie connection.
        if (!isMounted) {
          websocketService.disconnect();
          return;
        }
        
        setWebsocketStatus('connected');
        console.log(`📡 [useAppointments] Subscribing to appointments for business ${businessId}...`);
        unsubscribe = websocketService.subscribeToAppointments(businessId, (apiAppt: ApiAppointment) => {
          console.log(`📨 [useAppointments] Received appointment update:`, apiAppt);
          if (!isMounted) return;
          
          // Only process appointments for the current date being viewed
          if (apiAppt.appointmentDate !== currentDateStr) {
            return;
          }
          
          // If appointment is cancelled, remove it from the list
          if (apiAppt.status === 'CANCELLED') {
            setAppointments(prev => prev.filter(a => a.apiId !== apiAppt.id));
            return;
          }
          
          const appointmentDate = parse(apiAppt.appointmentDate, 'yyyy-MM-dd', new Date());
          const converted = convertAppointment(apiAppt, appointmentDate);
          const isNewAppointment = typeof apiAppt.id === 'number' && !seenAppointmentIdsRef.current.has(apiAppt.id);
          if (typeof apiAppt.id === 'number') {
            seenAppointmentIdsRef.current.add(apiAppt.id);
          }

          if (isNewAppointment) {
            playIncomingBookingSound();
          }
          
          setAppointments(prev => {
            const existing = prev.findIndex(a => a.apiId === converted.apiId);
            if (existing >= 0) {
              // Update existing
              const updated = [...prev];
              updated[existing] = converted;
              return updated;
            } else {
              // Add new appointment only if it's for the current date
              if (converted.date.toDateString() === currentDateRef.current.toDateString()) {
                return [...prev, converted];
              }
              return prev;
            }
          });
        });
        
        console.log(`✅ [useAppointments] WebSocket subscription set up for business ${businessId} on ${currentDateStr}`);
        setWebsocketStatus('connected');
      } catch (err: any) {
        console.error('❌ [useAppointments] WebSocket connection failed:', err);
        console.error('Error stack:', err.stack);
        console.error('Error details:', JSON.stringify(err, null, 2));
        setWebsocketStatus('error');
        // Don't show error toast - WebSocket is optional for real-time updates
        // Appointments will still load via API calls
      }
    };

    console.log('🚀 [useAppointments] Starting WebSocket setup...');
    setupWebSocket();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      // If cleanup runs while websocketService.connect() is still in flight
      // (e.g. fast navigation, StrictMode), disconnect to close the SockJS socket.
      // This prevents "WebSocket closed before connection established" errors.
      if (websocketService.isConnected() === false) {
        websocketService.disconnect();
      }
    };
  }, [businessId, date, playIncomingBookingSound]); // Include date in dependencies to re-subscribe when date changes

  const createAppointment = useCallback(async (request: {
    staffId: number;
    serviceId: number;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    price?: number;
    color?: string;
    notes?: string;
  }) => {
    try {
      const apiRequest = {
        businessId,
        staffId: request.staffId,
        serviceId: request.serviceId,
        appointmentDate: request.appointmentDate,
        startTime: request.startTime,
        endTime: request.endTime,
        clientName: request.clientName,
        clientPhone: request.clientPhone,
        clientEmail: request.clientEmail,
        price: request.price,
        color: request.color,
        notes: request.notes,
      };

      const created = await appointmentService.createAppointment(apiRequest);
      const appointmentDate = parse(created.appointmentDate, 'yyyy-MM-dd', new Date());
      const converted = convertAppointment(created, appointmentDate);
      
      setAppointments(prev => [...prev, converted]);
      toast.success('Appointment created successfully');
      return converted;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create appointment');
      throw err;
    }
  }, [businessId]);

  const updateAppointment = useCallback(async (id: number, request: {
    staffId: number;
    serviceId: number;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    clientId?: number;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    price?: number;
    color?: string;
    notes?: string;
  }) => {
    try {
      const apiRequest = { businessId, ...request };
      const updated = await appointmentService.updateAppointment(id, apiRequest);
      const appointmentDate = parse(updated.appointmentDate, 'yyyy-MM-dd', new Date());
      const converted = convertAppointment(updated, appointmentDate);
      setAppointments(prev => prev.map(apt => apt.apiId === id ? converted : apt));
      toast.success('Appointment updated successfully');
      return converted;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update appointment');
      throw err;
    }
  }, [businessId]);

  const deleteAppointment = useCallback(async (id: number) => {
    try {
      await appointmentService.deleteAppointment(id);
      setAppointments(prev => prev.filter(apt => apt.apiId !== id));
      toast.success('Appointment cancelled successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete appointment');
      throw err;
    }
  }, []);

  return {
    appointments,
    staff,
    loading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    refresh: () => loadAppointments(date || new Date()),
    websocketStatus,
  };
}



