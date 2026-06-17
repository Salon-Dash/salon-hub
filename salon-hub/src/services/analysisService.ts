import { apiClient } from '@/config/api';

export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

export interface TopService {
  serviceId: number;
  serviceName: string;
  bookings: number;
  revenue: number;
  growth: number;
}

export interface TopStaff {
  staffId: number;
  staffName: string;
  bookings: number;
  revenue: number;
  growth: number;
  averageTicket: number;
}

export interface RevenueByCategory {
  categoryName: string;
  revenue: number;
  bookings: number;
  percentage: number;
}

export interface ClientGrowth {
  totalClients: number;
  newClientsThisPeriod: number;
  returningClients: number;
  growthData: Array<{
    period: string;
    newClients: number;
    totalClients: number;
  }>;
}

export interface BookingTrends {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  cancellationRate: number;
  noShowRate: number;
  trendData: Array<{
    period: string;
    bookings: number;
    confirmed: number;
    cancelled: number;
  }>;
  bookingsByStatus: Record<string, number>;
  bookingsByDayOfWeek: Record<string, number>;
}

export interface StaffPerformance {
  staffDetails: Array<{
    staffId: number;
    staffName: string;
    bookings: number;
    revenue: number;
    averageTicket: number;
    utilizationRate: number;
    hoursWorked: number;
  }>;
  totalStaffRevenue: number;
  totalStaffBookings: number;
  averageRevenuePerStaff: number;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  revenueChange: number;
  totalBookings: number;
  bookingsChange: number;
  newClients: number;
  newClientsChange: number;
  averageTicket: number;
  averageTicketChange: number;
  dailyRevenue: DailyRevenue[];
  topServices: TopService[];
  topStaff: TopStaff[];
  revenueByCategory: RevenueByCategory[];
  clientGrowth: ClientGrowth;
  bookingTrends: BookingTrends;
  staffPerformance: StaffPerformance;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  averageDailyRevenue: number;
  peakDayRevenue: number;
  lowestDayRevenue: number;
  revenueByDay: Array<{ date: string; revenue: number; bookings: number }>;
  revenueByHour: Array<{ hour: number; revenue: number; bookings: number }>;
  revenueByPaymentMethod: Array<{ paymentMethod: string; revenue: number; transactions: number; percentage: number }>;
  revenueByDayOfWeek: Record<string, number>;
  revenueGrowthRate: number;
  revenueForecast: Array<{ period: string; forecastedRevenue: number; confidenceLevel: number }>;
}

export interface BookingAnalytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  cancellationRate: number;
  noShowRate: number;
  confirmationRate: number;
  bookingsByDayOfWeek: Array<{ dayOfWeek: string; bookings: number; percentage: number }>;
  bookingsByHour: Array<{ hour: number; bookings: number; percentage: number }>;
  bookingTrends: Array<{ period: string; bookings: number; confirmed: number; cancelled: number; noShow: number }>;
  bookingsByStatus: Record<string, number>;
  averageBookingsPerDay: number;
  peakDayBookings: number;
  cancellationReasons: Array<{ reason: string; count: number; percentage: number }>;
}

export interface ClientAnalytics {
  totalClients: number;
  newClients: number;
  returningClients: number;
  retentionRate: number;
  newClientRate: number;
  clientGrowth: Array<{ period: string; newClients: number; totalClients: number }>;
  topClients: Array<{ clientId: number; clientName: string; totalBookings: number; totalSpent: number; lastVisitDaysAgo: number; averageTicket: number }>;
  averageClientValue: number;
  averageVisitsPerClient: number;
  clientSegments: Array<{ segment: string; count: number; totalRevenue: number; percentage: number }>;
  activeClients: number;
  inactiveClients: number;
}

export interface ServiceAnalytics {
  servicePerformance: Array<{ serviceId: number; serviceName: string; categoryName: string; bookings: number; revenue: number; averagePrice: number; averageDuration: number; popularityScore: number; revenuePercentage: number }>;
  categoryPerformance: Array<{ categoryName: string; totalBookings: number; totalRevenue: number; serviceCount: number; averageServicePrice: number; revenuePercentage: number }>;
  averageServicePrice: number;
  mostPopularServiceId: number;
  mostPopularServiceName: string;
  highestRevenueServiceId: number;
  highestRevenueServiceName: string;
  serviceTrends: Array<{ serviceId: number; serviceName: string; period: string; bookings: number; revenue: number; growth: number }>;
  servicesByCategory: Record<string, number>;
}

export const analysisService = {
  async getAnalyticsOverview(
    businessId: number,
    startDate?: string,
    endDate?: string
  ): Promise<AnalyticsOverview> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/overview${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<AnalyticsOverview>(url);
  },
  
  async getRevenueAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ): Promise<RevenueAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/revenue${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<RevenueAnalytics>(url);
  },
  
  async getBookingAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ): Promise<BookingAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/bookings${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<BookingAnalytics>(url);
  },
  
  async getClientAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ClientAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/clients${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<ClientAnalytics>(url);
  },
  
  async getServiceAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ServiceAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/services${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<ServiceAnalytics>(url);
  },
  
  async getPerformanceAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/performance${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getCancellationAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/cancellations${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getPeakHoursAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/peak-hours${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getCustomerRetentionAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/customer-retention${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getProfitabilityAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/profitability${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getPaymentMethodAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/payment-methods${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getSeasonalAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/seasonal${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getServiceDurationAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/service-duration${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getWaitTimeAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/wait-times${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getBookingLeadTimeAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/booking-lead-time${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getRevenuePerHourAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/revenue-per-hour${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getCustomerAcquisitionAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/customer-acquisition${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getServiceBundleAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/service-bundles${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
  
  async getGrowthForecastAnalytics(
    businessId: number,
    startDate?: string,
    endDate?: string
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `/analytics/business/${businessId}/growth-forecast${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
};

