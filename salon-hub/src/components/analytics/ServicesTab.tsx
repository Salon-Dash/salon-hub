import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, Award } from "lucide-react";
import type { ServiceAnalytics } from "@/services/analysisService";

interface ServicesTabProps {
  data: ServiceAnalytics;
  loading: boolean;
}

export default function ServicesTab({ data }: ServicesTabProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Avg Service Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{data.averageServicePrice.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Most Popular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.mostPopularServiceName || 'N/A'}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Highest Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.highestRevenueServiceName || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance */}
      {data.servicePerformance && data.servicePerformance.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>Detailed performance metrics for each service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.servicePerformance.map((service, index) => (
                <div
                  key={service.serviceId}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-300 border border-border/30 hover:border-accent/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground text-xs flex items-center justify-center font-bold ring-2 ring-background">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{service.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.bookings} bookings • {service.popularityScore.toFixed(1)}% popularity
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-status-completed text-base">£{service.revenue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Avg: £{service.averagePrice.toFixed(2)} • {service.revenuePercentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Performance */}
      {data.categoryPerformance && data.categoryPerformance.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue and bookings by service category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {data.categoryPerformance.map((category, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{category.categoryName}</span>
                    <span className="text-sm text-muted-foreground">{category.revenuePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="text-xl font-bold mb-1">£{category.totalRevenue.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {category.totalBookings} bookings • {category.serviceCount} services
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg price: £{category.averageServicePrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

