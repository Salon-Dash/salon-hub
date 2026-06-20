import { useState, useEffect, useRef } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Download, 
  AlertCircle,
  Package,
  UserCheck,
  Activity,
  XCircle,
  Clock,
  Target,
  CreditCard,
  TrendingDown,
  Zap,
  Timer,
  ArrowRight,
  Gift,
  LineChart
} from "lucide-react";
import { useBusinessId } from "@/hooks/useBusinessId";
import { 
  analysisService, 
  type AnalyticsOverview,
  type RevenueAnalytics,
  type BookingAnalytics,
  type ClientAnalytics,
  type ServiceAnalytics
} from "@/services/analysisService";
import { format, subDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import OverviewTab from "@/components/analytics/OverviewTab";
import RevenueTab from "@/components/analytics/RevenueTab";
import BookingsTab from "@/components/analytics/BookingsTab";
import ClientsTab from "@/components/analytics/ClientsTab";
import ServicesTab from "@/components/analytics/ServicesTab";
import StaffTab from "@/components/analytics/StaffTab";

export default function AnalyticsPage() {
  const businessId = useBusinessId();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const fetchIdRef = useRef(0);

  // Analytics data states
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [bookings, setBookings] = useState<BookingAnalytics | null>(null);
  const [clients, setClients] = useState<ClientAnalytics | null>(null);
  const [services, setServices] = useState<ServiceAnalytics | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [cancellations, setCancellations] = useState<any>(null);
  const [peakHours, setPeakHours] = useState<any>(null);
  const [customerRetention, setCustomerRetention] = useState<any>(null);
  const [profitability, setProfitability] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any>(null);
  const [seasonal, setSeasonal] = useState<any>(null);
  const [serviceDuration, setServiceDuration] = useState<any>(null);
  const [waitTimes, setWaitTimes] = useState<any>(null);
  const [leadTime, setLeadTime] = useState<any>(null);
  const [revenuePerHour, setRevenuePerHour] = useState<any>(null);
  const [acquisition, setAcquisition] = useState<any>(null);
  const [bundles, setBundles] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);

  const getDateRange = () => {
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
    return { startDate, endDate };
  };

  // Reset all cached data when period changes so guards allow re-fetching
  useEffect(() => {
    setOverview(null);
    setRevenue(null);
    setBookings(null);
    setClients(null);
    setServices(null);
    setPerformance(null);
    setCancellations(null);
    setPeakHours(null);
    setCustomerRetention(null);
    setProfitability(null);
    setPaymentMethods(null);
    setSeasonal(null);
    setServiceDuration(null);
    setWaitTimes(null);
    setLeadTime(null);
    setRevenuePerHour(null);
    setAcquisition(null);
    setBundles(null);
    setForecast(null);
  }, [period]);

  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      const currentFetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const { startDate, endDate } = getDateRange();
        
        // Fetch overview data
        if (activeTab === "overview" || !overview) {
          const overviewData = await analysisService.getAnalyticsOverview(businessId, startDate, endDate);
          setOverview(overviewData);
        }
        
        // Fetch tab-specific data
        const { startDate: sd, endDate: ed } = getDateRange();
        
        if (activeTab === "revenue" && !revenue) {
          setRevenue(await analysisService.getRevenueAnalytics(businessId, sd, ed));
        } else if (activeTab === "bookings" && !bookings) {
          setBookings(await analysisService.getBookingAnalytics(businessId, sd, ed));
        } else if (activeTab === "clients" && !clients) {
          setClients(await analysisService.getClientAnalytics(businessId, sd, ed));
        } else if (activeTab === "services" && !services) {
          setServices(await analysisService.getServiceAnalytics(businessId, sd, ed));
        } else if (activeTab === "performance" && !performance) {
          setPerformance(await analysisService.getPerformanceAnalytics(businessId, sd, ed));
        } else if (activeTab === "cancellations" && !cancellations) {
          setCancellations(await analysisService.getCancellationAnalytics(businessId, sd, ed));
        } else if (activeTab === "peak-hours" && !peakHours) {
          setPeakHours(await analysisService.getPeakHoursAnalytics(businessId, sd, ed));
        } else if (activeTab === "customer-retention" && !customerRetention) {
          setCustomerRetention(await analysisService.getCustomerRetentionAnalytics(businessId, sd, ed));
        } else if (activeTab === "profitability" && !profitability) {
          setProfitability(await analysisService.getProfitabilityAnalytics(businessId, sd, ed));
        } else if (activeTab === "payment-methods" && !paymentMethods) {
          setPaymentMethods(await analysisService.getPaymentMethodAnalytics(businessId, sd, ed));
        } else if (activeTab === "seasonal" && !seasonal) {
          setSeasonal(await analysisService.getSeasonalAnalytics(businessId, sd, ed));
        } else if (activeTab === "service-duration" && !serviceDuration) {
          setServiceDuration(await analysisService.getServiceDurationAnalytics(businessId, sd, ed));
        } else if (activeTab === "wait-times" && !waitTimes) {
          setWaitTimes(await analysisService.getWaitTimeAnalytics(businessId, sd, ed));
        } else if (activeTab === "lead-time" && !leadTime) {
          setLeadTime(await analysisService.getBookingLeadTimeAnalytics(businessId, sd, ed));
        } else if (activeTab === "revenue-per-hour" && !revenuePerHour) {
          setRevenuePerHour(await analysisService.getRevenuePerHourAnalytics(businessId, sd, ed));
        } else if (activeTab === "acquisition" && !acquisition) {
          setAcquisition(await analysisService.getCustomerAcquisitionAnalytics(businessId, sd, ed));
        } else if (activeTab === "bundles" && !bundles) {
          setBundles(await analysisService.getServiceBundleAnalytics(businessId, sd, ed));
        } else if (activeTab === "forecast" && !forecast) {
          setForecast(await analysisService.getGrowthForecastAnalytics(businessId, sd, ed));
        }
      } catch (err) {
        if (currentFetchId !== fetchIdRef.current) return; // stale fetch — a newer one is in flight
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data");
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [businessId, period, activeTab]);

  const tabDataMap: Record<string, unknown> = {
    overview, revenue, bookings, clients, services,
    performance, cancellations, "peak-hours": peakHours,
    "customer-retention": customerRetention, profitability,
    "payment-methods": paymentMethods, seasonal,
    "service-duration": serviceDuration, "wait-times": waitTimes,
    "lead-time": leadTime, "revenue-per-hour": revenuePerHour,
    acquisition, bundles, forecast,
    staff: overview?.staffPerformance,
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Only show loading spinner if this tab's data is not yet cached
    if (!tabDataMap[value]) {
      setLoading(true);
    }
  };

  if (loading && !overview && !revenue && !bookings && !clients && !services) {
    return (
      <AppLayout>
        <PageHeader title="Analytics" subtitle="Insights and performance metrics" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageHeader title="Analytics" subtitle="Insights and performance metrics" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        subtitle="Comprehensive business insights and performance metrics"
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
            >
              <Download size={16} />
              Export
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto mb-6">
            <TabsList className="inline-flex min-w-full bg-muted/50">
              <TabsTrigger value="overview" className="flex items-center gap-2 whitespace-nowrap">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-2 whitespace-nowrap">
                <DollarSign className="h-4 w-4" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2 whitespace-nowrap">
                <Calendar className="h-4 w-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2 whitespace-nowrap">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2 whitespace-nowrap">
                <Package className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2 whitespace-nowrap">
                <UserCheck className="h-4 w-4" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2 whitespace-nowrap">
                <Activity className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="cancellations" className="flex items-center gap-2 whitespace-nowrap">
                <XCircle className="h-4 w-4" />
                Cancellations
              </TabsTrigger>
              <TabsTrigger value="peak-hours" className="flex items-center gap-2 whitespace-nowrap">
                <Zap className="h-4 w-4" />
                Peak Hours
              </TabsTrigger>
              <TabsTrigger value="customer-retention" className="flex items-center gap-2 whitespace-nowrap">
                <Target className="h-4 w-4" />
                Retention
              </TabsTrigger>
              <TabsTrigger value="profitability" className="flex items-center gap-2 whitespace-nowrap">
                <TrendingUp className="h-4 w-4" />
                Profitability
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-2 whitespace-nowrap">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="flex items-center gap-2 whitespace-nowrap">
                <TrendingDown className="h-4 w-4" />
                Seasonal
              </TabsTrigger>
              <TabsTrigger value="service-duration" className="flex items-center gap-2 whitespace-nowrap">
                <Timer className="h-4 w-4" />
                Duration
              </TabsTrigger>
              <TabsTrigger value="wait-times" className="flex items-center gap-2 whitespace-nowrap">
                <Clock className="h-4 w-4" />
                Wait Times
              </TabsTrigger>
              <TabsTrigger value="lead-time" className="flex items-center gap-2 whitespace-nowrap">
                <ArrowRight className="h-4 w-4" />
                Lead Time
              </TabsTrigger>
              <TabsTrigger value="revenue-per-hour" className="flex items-center gap-2 whitespace-nowrap">
                <DollarSign className="h-4 w-4" />
                Revenue/Hour
              </TabsTrigger>
              <TabsTrigger value="acquisition" className="flex items-center gap-2 whitespace-nowrap">
                <Users className="h-4 w-4" />
                Acquisition
              </TabsTrigger>
              <TabsTrigger value="bundles" className="flex items-center gap-2 whitespace-nowrap">
                <Gift className="h-4 w-4" />
                Bundles
              </TabsTrigger>
              <TabsTrigger value="forecast" className="flex items-center gap-2 whitespace-nowrap">
                <LineChart className="h-4 w-4" />
                Forecast
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            {overview ? (
              <OverviewTab data={overview} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="mt-0">
            {revenue ? (
              <RevenueTab data={revenue} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            {bookings ? (
              <BookingsTab data={bookings} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            {clients ? (
              <ClientsTab data={clients} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="mt-0">
            {services ? (
              <ServicesTab data={services} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff" className="mt-0">
            {overview?.staffPerformance ? (
              <StaffTab data={overview.staffPerformance} loading={loading} />
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-sm text-red-500">Failed to load staff data</p>
                <button onClick={() => { setError(null); setOverview(null); }} className="text-sm text-blue-600 underline">Retry</button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          {/* New Analytics Tabs */}
          <TabsContent value="performance" className="mt-0">
            {performance ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analytics</CardTitle>
                    <CardDescription>Staff utilization and efficiency metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Booking Efficiency</p>
                        <p className="text-2xl font-bold">{performance.bookingEfficiency?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Staff Utilization</p>
                        <p className="text-2xl font-bold">{performance.staffUtilizationRate?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Service Completion</p>
                        <p className="text-2xl font-bold">{performance.serviceCompletionRate?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancellations" className="mt-0">
            {cancellations ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cancellation Analytics</CardTitle>
                    <CardDescription>Cancellation and no-show analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                        <p className="text-2xl font-bold">{cancellations.cancellationRate?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">No-Show Rate</p>
                        <p className="text-2xl font-bold">{cancellations.noShowRate?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Lost (Cancellations)</p>
                        <p className="text-2xl font-bold">£{cancellations.revenueLostToCancellations?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Lost (No-Shows)</p>
                        <p className="text-2xl font-bold">£{cancellations.revenueLostToNoShows?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="peak-hours" className="mt-0">
            {peakHours ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Peak Hours Analytics</CardTitle>
                    <CardDescription>Busiest hours and optimal booking times</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Busiest Hour</p>
                        <p className="text-2xl font-bold">{peakHours.busiestHour || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Busiest Day</p>
                        <p className="text-2xl font-bold">{peakHours.busiestDay || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="customer-retention" className="mt-0">
            {customerRetention ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Retention Analytics</CardTitle>
                    <CardDescription>Customer loyalty and lifetime value</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Repeat Customer Rate</p>
                        <p className="text-2xl font-bold">{customerRetention.repeatCustomerRate?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average CLV</p>
                        <p className="text-2xl font-bold">£{customerRetention.averageCustomerLifetimeValue?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Visits/Customer</p>
                        <p className="text-2xl font-bold">{customerRetention.averageVisitsPerCustomer?.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Repeat Customers</p>
                        <p className="text-2xl font-bold">{customerRetention.totalRepeatCustomers || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="profitability" className="mt-0">
            {profitability ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profitability Analytics</CardTitle>
                    <CardDescription>Profit margins and cost analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Profit</p>
                        <p className="text-2xl font-bold">£{profitability.totalProfit?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Profit Margin</p>
                        <p className="text-2xl font-bold">{profitability.profitMargin?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Profit/Booking</p>
                        <p className="text-2xl font-bold">£{profitability.averageProfitPerBooking?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">£{profitability.totalRevenue?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0">
            {paymentMethods ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Analytics</CardTitle>
                    <CardDescription>Payment distribution and trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Most Popular Method</p>
                        <p className="text-2xl font-bold">{paymentMethods.mostPopularMethod || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Highest Value Method</p>
                        <p className="text-2xl font-bold">{paymentMethods.highestValueMethod || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="seasonal" className="mt-0">
            {seasonal ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Analytics</CardTitle>
                    <CardDescription>Monthly trends and seasonal patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Best Month</p>
                        <p className="text-2xl font-bold">{seasonal.bestMonth || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Worst Month</p>
                        <p className="text-2xl font-bold">{seasonal.worstMonth || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="service-duration" className="mt-0">
            {serviceDuration ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Duration Analytics</CardTitle>
                    <CardDescription>Service duration efficiency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Scheduled Duration</p>
                        <p className="text-2xl font-bold">{serviceDuration.averageScheduledDuration?.toFixed(0)} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Actual Duration</p>
                        <p className="text-2xl font-bold">{serviceDuration.averageActualDuration?.toFixed(0)} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration Efficiency</p>
                        <p className="text-2xl font-bold">{serviceDuration.durationEfficiency?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="wait-times" className="mt-0">
            {waitTimes ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Wait Time Analytics</CardTitle>
                    <CardDescription>Average wait times and gaps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Wait Time</p>
                        <p className="text-2xl font-bold">{waitTimes.averageWaitTime?.toFixed(1)} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Gap Time</p>
                        <p className="text-2xl font-bold">{waitTimes.averageGapTime?.toFixed(1)} min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="lead-time" className="mt-0">
            {leadTime ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Lead Time Analytics</CardTitle>
                    <CardDescription>Time between booking and appointment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Lead Time</p>
                        <p className="text-2xl font-bold">{leadTime.averageLeadTime?.toFixed(1)} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Median Lead Time</p>
                        <p className="text-2xl font-bold">{leadTime.medianLeadTime?.toFixed(1)} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="revenue-per-hour" className="mt-0">
            {revenuePerHour ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Per Hour Analytics</CardTitle>
                    <CardDescription>Hourly revenue breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Revenue/Hour</p>
                        <p className="text-2xl font-bold">£{revenuePerHour.averageRevenuePerHour?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Best Hour</p>
                        <p className="text-2xl font-bold">{revenuePerHour.bestPerformingHour || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Peak Hour Revenue</p>
                        <p className="text-2xl font-bold">£{revenuePerHour.peakHourRevenue?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="acquisition" className="mt-0">
            {acquisition ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Acquisition Analytics</CardTitle>
                    <CardDescription>New customer metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">New Customers</p>
                        <p className="text-2xl font-bold">{acquisition.newCustomers || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg First Visit Value</p>
                        <p className="text-2xl font-bold">£{acquisition.averageFirstVisitValue?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Acquisition Cost</p>
                        <p className="text-2xl font-bold">£{acquisition.customerAcquisitionCost?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="bundles" className="mt-0">
            {bundles ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Bundle Analytics</CardTitle>
                    <CardDescription>Bundle performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bundles Sold</p>
                        <p className="text-2xl font-bold">{bundles.totalBundlesSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bundle Revenue</p>
                        <p className="text-2xl font-bold">£{bundles.bundleRevenue?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Bundle Value</p>
                        <p className="text-2xl font-bold">£{bundles.averageBundleValue?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue %</p>
                        <p className="text-2xl font-bold">{bundles.bundleRevenuePercentage?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="forecast" className="mt-0">
            {forecast ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Forecast Analytics</CardTitle>
                    <CardDescription>Revenue and booking forecasts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Revenue Growth</p>
                        <p className="text-2xl font-bold">{forecast.projectedRevenueGrowth?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Booking Growth</p>
                        <p className="text-2xl font-bold">{forecast.projectedBookingGrowth?.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
