import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Award,
  UserCheck,
  Activity,
  Target
} from "lucide-react";
import { format } from "date-fns";
import type { AnalyticsOverview } from "@/services/analysisService";

interface OverviewTabProps {
  data: AnalyticsOverview;
  loading: boolean;
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const metrics = [
    { 
      title: "Total Revenue", 
      value: `£${data.totalRevenue.toFixed(2)}`, 
      change: `${data.revenueChange >= 0 ? '+' : ''}${data.revenueChange.toFixed(1)}%`, 
      trend: data.revenueChange >= 0 ? "up" : "down", 
      period: "vs previous period", 
      icon: DollarSign, 
      color: "text-status-completed", 
      bgColor: "bg-status-completed/10" 
    },
    { 
      title: "Total Bookings", 
      value: data.totalBookings.toString(), 
      change: `${data.bookingsChange >= 0 ? '+' : ''}${data.bookingsChange}%`, 
      trend: data.bookingsChange >= 0 ? "up" : "down", 
      period: "vs previous period", 
      icon: Calendar, 
      color: "text-appointment-blue", 
      bgColor: "bg-appointment-blue/10" 
    },
    { 
      title: "New Clients", 
      value: data.newClients.toString(), 
      change: `${data.newClientsChange >= 0 ? '+' : ''}${data.newClientsChange}%`, 
      trend: data.newClientsChange >= 0 ? "up" : "down", 
      period: "vs previous period", 
      icon: Users, 
      color: "text-appointment-purple", 
      bgColor: "bg-appointment-purple/10" 
    },
    { 
      title: "Avg. Ticket", 
      value: `£${data.averageTicket.toFixed(2)}`, 
      change: `${data.averageTicketChange >= 0 ? '+' : ''}${data.averageTicketChange.toFixed(1)}%`, 
      trend: data.averageTicketChange >= 0 ? "up" : "down", 
      period: "vs previous period", 
      icon: TrendingUp, 
      color: "text-appointment-coral", 
      bgColor: "bg-appointment-coral/10" 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={metric.title}
              className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {metric.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl ${metric.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">{metric.value}</div>
                <div className="flex items-center gap-1.5">
                  {metric.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-status-completed" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-semibold ${metric.trend === "up" ? "text-status-completed" : "text-destructive"}`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.period}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Revenue Overview</CardTitle>
              <CardDescription className="mt-1">Daily revenue for the selected period</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/60">
            {data.dailyRevenue && data.dailyRevenue.length > 0 ? (
              <div className="w-full h-full flex items-end justify-between gap-1 p-4">
                {data.dailyRevenue.map((day, index) => {
                  const maxRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                      <div 
                        className="w-full bg-gradient-to-t from-status-completed to-status-completed/60 rounded-t hover:from-status-completed/80 hover:to-status-completed/40 transition-all cursor-pointer"
                        style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                        title={`${format(new Date(day.date), "MMM dd")}: £${day.revenue.toFixed(2)}`}
                      />
                      <span className="text-[10px] text-muted-foreground hidden md:block">
                        {format(new Date(day.date), "MMM dd")}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">No revenue data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Services and Top Staff */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Services */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Top Services</CardTitle>
                <CardDescription className="mt-1">Most booked services this period</CardDescription>
              </div>
              <Award className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topServices && data.topServices.length > 0 ? (
                data.topServices.map((service, index) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-300 border border-border/30 hover:border-accent/30 hover:shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground text-xs flex items-center justify-center font-bold ring-2 ring-background group-hover:ring-accent/30 transition-all">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{service.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-status-completed text-base">£{service.revenue.toFixed(2)}</div>
                      {service.growth !== 0 && (
                        <div className={`text-xs font-medium ${service.growth > 0 ? 'text-status-completed' : 'text-destructive'}`}>
                          {service.growth > 0 ? '+' : ''}{service.growth.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No service data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Staff */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Top Performers</CardTitle>
                <CardDescription className="mt-1">Staff revenue leaders this period</CardDescription>
              </div>
              <UserCheck className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topStaff && data.topStaff.length > 0 ? (
                data.topStaff.map((staff, index) => (
                  <div
                    key={staff.staffId}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-300 border border-border/30 hover:border-accent/30 hover:shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground text-xs flex items-center justify-center font-bold ring-2 ring-background group-hover:ring-accent/30 transition-all">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{staff.staffName}</p>
                        <p className="text-xs text-muted-foreground">{staff.bookings} bookings • Avg: £{staff.averageTicket.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-status-completed text-base">£{staff.revenue.toFixed(2)}</div>
                      {staff.growth !== 0 && (
                        <div className={`text-xs font-medium ${staff.growth > 0 ? 'text-status-completed' : 'text-destructive'}`}>
                          {staff.growth > 0 ? '+' : ''}{staff.growth.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No staff data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Trends and Staff Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Trends */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Booking Trends</CardTitle>
                <CardDescription className="mt-1">Booking status breakdown</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-status-completed/10 to-status-completed/5 border border-status-completed/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-status-completed" />
                    <span className="text-xs font-semibold text-muted-foreground">Confirmed</span>
                  </div>
                  <div className="text-2xl font-bold">{data.bookingTrends.confirmedBookings}</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-semibold text-muted-foreground">Cancelled</span>
                  </div>
                  <div className="text-2xl font-bold">{data.bookingTrends.cancelledBookings}</div>
                  <div className="text-xs text-destructive mt-1">
                    {data.bookingTrends.cancellationRate.toFixed(1)}% rate
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Performance Summary */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Staff Performance</CardTitle>
                <CardDescription className="mt-1">Overall staff metrics</CardDescription>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-appointment-blue/10 to-appointment-blue/5 border border-appointment-blue/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-appointment-blue" />
                    <span className="text-xs font-semibold text-muted-foreground">Total Staff</span>
                  </div>
                  <div className="text-2xl font-bold">{data.staffPerformance.staffDetails.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-status-completed/10 to-status-completed/5 border border-status-completed/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-status-completed" />
                    <span className="text-xs font-semibold text-muted-foreground">Avg Revenue</span>
                  </div>
                  <div className="text-2xl font-bold">£{data.staffPerformance.averageRevenuePerStaff.toFixed(2)}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Total Staff Revenue</span>
                </div>
                <div className="text-xl font-bold">£{data.staffPerformance.totalStaffRevenue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.staffPerformance.totalStaffBookings} total bookings
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

