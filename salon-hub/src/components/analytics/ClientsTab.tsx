import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCheck, UserX } from "lucide-react";
import type { ClientAnalytics } from "@/services/analysisService";

interface ClientsTabProps {
  data: ClientAnalytics;
  loading: boolean;
}

export default function ClientsTab({ data }: ClientsTabProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No client data available</p>
      </div>
    );
  }

  // Safely extract values with defaults
  const totalClients = data.totalClients ?? 0;
  const newClients = data.newClients ?? 0;
  const activeClients = data.activeClients ?? 0;
  const averageClientValue = data.averageClientValue ?? 0;
  const averageVisitsPerClient = data.averageVisitsPerClient ?? 0;
  const newClientRate = data.newClientRate ?? 0;
  const topClients = data.topClients ?? [];
  const clientSegments = data.clientSegments ?? [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">New Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-completed">{newClients}</div>
            {newClientRate > 0 && (
              <div className="text-xs text-muted-foreground mt-1">{newClientRate.toFixed(1)}% of total</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-appointment-blue">{activeClients}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Avg Client Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{averageClientValue.toFixed(2)}</div>
            {averageVisitsPerClient > 0 && (
              <div className="text-xs text-muted-foreground mt-1">{averageVisitsPerClient.toFixed(1)} avg visits</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      {topClients.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <CardDescription>Highest value clients this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-300 border border-border/30 hover:border-accent/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground text-xs flex items-center justify-center font-bold ring-2 ring-background">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{client.clientName || 'Unknown Client'}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.totalBookings ?? 0} bookings • Avg: £{(client.averageTicket ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-status-completed text-base">£{(client.totalSpent ?? 0).toFixed(2)}</div>
                    {client.lastVisitDaysAgo !== null && client.lastVisitDaysAgo !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {client.lastVisitDaysAgo === 0 ? 'Today' : `${client.lastVisitDaysAgo} days ago`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Segments */}
      {clientSegments.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Client Segments</CardTitle>
            <CardDescription>Client categorization by value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {clientSegments.map((segment, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{segment.segment || 'Unknown'}</span>
                    <span className="text-sm text-muted-foreground">{(segment.percentage ?? 0).toFixed(1)}%</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{segment.count ?? 0}</div>
                  <div className="text-sm text-muted-foreground">£{(segment.totalRevenue ?? 0).toFixed(2)} revenue</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
