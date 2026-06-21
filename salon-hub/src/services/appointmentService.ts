import { apiClient } from '@/config/api';
import { format } from 'date-fns';

export interface Appointment {
  id: number;
  businessId: number;
  staffId: number;
  staffName?: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: number;
  serviceName?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  price?: number;
  color?: string;
  notes?: string;
}

export interface CreateAppointmentRequest {
  businessId: number;
  staffId: number;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  price?: number;
  color?: string;
  notes?: string;
}

export const appointmentService = {
  async getAppointmentById(id: number): Promise<Appointment> {
    return apiClient.get<Appointment>(`/appointments/${id}`);
  },

  async getAppointmentsByBusiness(businessId: number, date?: Date): Promise<Appointment[]> {
    // Always provide a date - use provided date or default to today
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // API requires either 'date' OR 'startDate'/'endDate'
    // Using startDate/endDate for single day query (both set to the same date)
    const params = new URLSearchParams();
    params.append('startDate', dateStr);
    params.append('endDate', dateStr);
    
    return apiClient.get<Appointment[]>(`/appointments/business/${businessId}?${params.toString()}`);
  },

  async getAppointmentsByStaff(staffId: number, date?: Date): Promise<Appointment[]> {
    // Always provide a date - use provided date or default to today
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // API requires either 'date' OR 'startDate'/'endDate'
    // Using startDate/endDate for single day query (both set to the same date)
    const params = new URLSearchParams();
    params.append('startDate', dateStr);
    params.append('endDate', dateStr);
    
    return apiClient.get<Appointment[]>(`/appointments/staff/${staffId}?${params.toString()}`);
  },

  async createAppointment(request: CreateAppointmentRequest): Promise<Appointment> {
    const idempotencyKey = `${request.businessId}-${request.staffId}-${request.appointmentDate}-${request.startTime}-${Date.now()}`;
    return apiClient.post<Appointment>('/appointments', {
      ...request,
      idempotencyKey,
    });
  },

  async updateAppointment(id: number, request: CreateAppointmentRequest): Promise<Appointment> {
    return apiClient.put<Appointment>(`/appointments/${id}`, request);
  },

  async deleteAppointment(id: number): Promise<void> {
    return apiClient.delete<void>(`/appointments/${id}`);
  },

  async confirmAppointment(id: number): Promise<Appointment> {
    return apiClient.put<Appointment>(`/bookings/${id}/confirm`, {});
  },

  async cancelAppointment(id: number, reason: string): Promise<void> {
    return apiClient.put<void>(`/appointments/${id}/cancel`, { reason });
  },
};




