import { apiClient } from "@/config/api";

export interface ClientWithStats {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  avatarUrl: string | null;
  preferredLanguage: string | null;
  preferredContactMethod: string | null;
  status: string;
  allowMarketingEmails: boolean | null;
  allowSmsNotifications: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  totalVisits: number;
  totalSpent: number | null;
  lastVisitDate: string | null;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

export interface Client {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  avatarUrl: string | null;
  preferredLanguage: string | null;
  preferredContactMethod: string | null;
  status: string;
  allowMarketingEmails: boolean | null;
  allowSmsNotifications: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

class ClientService {
  /**
   * Get clients who have booked appointments for a business
   */
  async getClientsWithAppointments(businessId: number): Promise<ClientWithStats[]> {
    return apiClient.get<ClientWithStats[]>(`/bookings/business/${businessId}/clients`);
  }

  /**
   * Get all clients for a business (for dropdown selection)
   */
  async getClientsByBusiness(businessId: number): Promise<Client[]> {
    return apiClient.get<Client[]>(`/clients/business/${businessId}`);
  }

  /**
   * Create a new client for a business
   */
  async createClient(businessId: number, clientData: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    sendInvitation?: boolean;
  }): Promise<Client> {
    return apiClient.post<Client>(`/clients/business/${businessId}`, clientData);
  }
}

export interface Invitation {
  id: number;
  businessId: number;
  clientId?: number;
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  referralCode: string;
  type: string;
  status: string;
  appointmentId?: number;
  message?: string;
  expiresAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

class InvitationService {
  /**
   * Create an invitation for a client
   */
  async createInvitation(businessId: number, invitationData: {
    clientId?: number;
    recipientName: string;
    recipientEmail?: string;
    recipientPhone?: string;
    type: string;
    appointmentId?: number;
    message?: string;
    expirationDays?: number;
  }): Promise<Invitation> {
    return apiClient.post<Invitation>('/invitations', {
      businessId,
      ...invitationData,
    });
  }

  /**
   * Get invitations by business
   */
  async getInvitationsByBusiness(businessId: number): Promise<Invitation[]> {
    return apiClient.get<Invitation[]>(`/invitations/business/${businessId}`);
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: number): Promise<void> {
    return apiClient.put(`/invitations/${invitationId}/cancel`, {});
  }

  /**
   * Mark invitation as sent
   */
  async markAsSent(invitationId: number): Promise<Invitation> {
    return apiClient.put<Invitation>(`/invitations/${invitationId}/sent`, {});
  }

  /**
   * Get invitation by referral code
   */
  async getInvitationByCode(referralCode: string): Promise<Invitation> {
    return apiClient.get<Invitation>(`/invitations/code/${referralCode}`);
  }
}

export const invitationService = new InvitationService();

export const clientService = new ClientService();

