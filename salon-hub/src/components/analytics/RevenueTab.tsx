import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { money, pct } from "@/lib/utils";
import { DollarSign, TrendingUp, Clock, CreditCard } from "lucide-react";
import { format } from "date-fns";
import type { RevenueAnalytics } from "@/services/analysisService";

interface RevenueTabProps {
  data: RevenueAnalytics;
  loading: boolean;
}

export default function RevenueTab({ data }: RevenueTabProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(data.totalRevenue)} zł</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Avg Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(data.averageDailyRevenue)} zł</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Peak Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(data.peakDayRevenue)} zł</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Lowest Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(data.lowestDayRevenue)} zł</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Day */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
          <CardDescription>Revenue breakdown by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/60">
            {data.revenueByDay && data.revenueByDay.length > 0 ? (
              data.revenueByDay.map((day, index) => {
                const maxRevenue = Math.max(...data.revenueByDay.map(d => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-status-completed to-status-completed/60 rounded-t transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                      title={`${format(new Date(day.date), "MMM dd")}: ${money(day.revenue)} zł`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(day.date), "MMM dd")}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Hour */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Hourly Revenue Pattern</CardTitle>
          <CardDescription>Revenue distribution throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/60">
            {data.revenueByHour && data.revenueByHour.length > 0 ? (
              data.revenueByHour.map((hour, index) => {
                const maxRevenue = Math.max(...data.revenueByHour.map(h => h.revenue));
                const height = maxRevenue > 0 ? (hour.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-appointment-blue to-appointment-blue/60 rounded-t transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                      title={`${hour.hour}:00 - ${money(hour.revenue)} zł`}
                    />
                    <span className="text-[9px] text-muted-foreground">{hour.hour}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Payment Method */}
      {data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
            <CardDescription>Breakdown of revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenueByPaymentMethod.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{method.paymentMethod}</p>
                      <p className="text-xs text-muted-foreground">{method.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{money(method.revenue)} zł</div>
                    <div className="text-xs text-muted-foreground">{pct(method.percentage)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Day of Week */}
      {data.revenueByDayOfWeek && Object.keys(data.revenueByDayOfWeek).length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue by Day of Week</CardTitle>
            <CardDescription>Weekly revenue patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.revenueByDayOfWeek).map(([day, revenue]) => (
                <div key={day} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30">
                  <span className="font-semibold">{day}</span>
                  <span className="font-bold text-lg">{money(revenue)} zł</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

