import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import type { BookingAnalytics } from "@/services/analysisService";

interface BookingsTabProps {
  data: BookingAnalytics;
  loading: boolean;
}

export default function BookingsTab({ data }: BookingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBookings}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-completed">{data.confirmedBookings}</div>
            <div className="text-xs text-muted-foreground mt-1">{data.confirmationRate.toFixed(1)}% rate</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.cancelledBookings}</div>
            <div className="text-xs text-muted-foreground mt-1">{data.cancellationRate.toFixed(1)}% rate</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">No Shows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{data.noShowBookings}</div>
            <div className="text-xs text-muted-foreground mt-1">{data.noShowRate.toFixed(1)}% rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings by Day of Week */}
      {data.bookingsByDayOfWeek && data.bookingsByDayOfWeek.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Bookings by Day of Week</CardTitle>
            <CardDescription>Weekly booking patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/60">
              {data.bookingsByDayOfWeek.map((day, index) => {
                const maxBookings = Math.max(...data.bookingsByDayOfWeek.map(d => d.bookings));
                const height = maxBookings > 0 ? (day.bookings / maxBookings) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-appointment-blue to-appointment-blue/60 rounded-t transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                      title={`${day.dayOfWeek}: ${day.bookings} bookings (${day.percentage.toFixed(1)}%)`}
                    />
                    <span className="text-[10px] text-muted-foreground text-center">
                      {day.dayOfWeek.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings by Hour */}
      {data.bookingsByHour && data.bookingsByHour.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Bookings by Hour</CardTitle>
            <CardDescription>Hourly booking distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/60">
              {data.bookingsByHour.map((hour, index) => {
                const maxBookings = Math.max(...data.bookingsByHour.map(h => h.bookings));
                const height = maxBookings > 0 ? (hour.bookings / maxBookings) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-appointment-purple to-appointment-purple/60 rounded-t transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                      title={`${hour.hour}:00 - ${hour.bookings} bookings (${hour.percentage.toFixed(1)}%)`}
                    />
                    <span className="text-[9px] text-muted-foreground">{hour.hour}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Status Breakdown */}
      {data.bookingsByStatus && Object.keys(data.bookingsByStatus).length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Booking Status Breakdown</CardTitle>
            <CardDescription>Distribution of booking statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.bookingsByStatus).map(([status, count]) => {
                const percentage = data.totalBookings > 0 ? (count / data.totalBookings) * 100 : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize">{status.toLowerCase()}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-status-completed h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

