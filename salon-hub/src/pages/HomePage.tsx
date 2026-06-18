import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, Users, TrendingUp, Clock, Star, Building2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUserBusinesses, isBusinessOwner } from "@/utils/businessUtils";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import { analysisService, type AnalyticsOverview } from "@/services/analysisService";
import { appointmentService, type Appointment } from "@/services/appointmentService";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { businessId } = useParams<{ businessId?: string }>();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noBusiness, setNoBusiness] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [creatingBiz, setCreatingBiz] = useState(false);

  // Real dashboard data
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const numericBusinessId = businessId ? parseInt(businessId, 10) : null;

  // Fetch real dashboard stats when on a business route
  useEffect(() => {
    if (!numericBusinessId) return;
    const fetchDashboardData = async () => {
      setStatsLoading(true);
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const [overviewData, appts] = await Promise.all([
          analysisService.getAnalyticsOverview(numericBusinessId, today, today),
          appointmentService.getAppointmentsByBusiness(numericBusinessId, new Date()),
        ]);
        setOverview(overviewData);
        setTodayAppointments(appts.slice(0, 4));
      } catch {
        // Non-critical — dashboard still renders without stats
      } finally {
        setStatsLoading(false);
      }
    };
    fetchDashboardData();
  }, [numericBusinessId]);

  useEffect(() => {
    const loadBusinesses = async () => {
      // If we're already on a business-specific route, show the dashboard
      if (businessId) {
        setLoading(false);
        return;
      }

      // If user is not a business owner, show regular dashboard
      if (!isBusinessOwner()) {
        setLoading(false);
        return;
      }

      try {
        const userBusinesses = await getUserBusinesses();
        setBusinesses(userBusinesses);

        // If user has only one business, redirect to it
        if (userBusinesses.length === 1) {
          // Store business ID in localStorage
          localStorage.setItem("currentBusinessId", userBusinesses[0].id.toString());
          localStorage.setItem("currentBusiness", JSON.stringify(userBusinesses[0]));
          navigate(`/${userBusinesses[0].id}/calendar`, { replace: true });
          return;
        }

        // If user has no businesses, show inline creation prompt
        if (userBusinesses.length === 0) {
          setNoBusiness(true);
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error("Error loading businesses:", error);
        // Don't show error toast - this might be a temporary service issue
        // The user can still use the app, they just won't see business selection
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, [businessId, navigate]);

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) { toast.error("Enter your business name"); return; }
    setCreatingBiz(true);
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const business = await businessService.createBusiness({ ownerId: user?.id, name: newBizName.trim() });
      localStorage.setItem("currentBusinessId", business.id.toString());
      localStorage.setItem("currentBusiness", JSON.stringify(business));
      toast.success("Business created!");
      navigate(`/${business.id}/calendar`, { replace: true });
    } catch {
      toast.error("Failed to create business. Please try again.");
    } finally {
      setCreatingBiz(false);
    }
  };

  // No business found — show creation prompt
  if (noBusiness) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <Building2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Set up your business</CardTitle>
              <CardDescription>Create your first business to get started with Booksy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bizName">Business name</Label>
                <Input
                  id="bizName"
                  placeholder="e.g. Glamour Studio"
                  value={newBizName}
                  onChange={e => setNewBizName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateBusiness()}
                />
              </div>
              <Button className="w-full" onClick={handleCreateBusiness} disabled={creatingBiz}>
                {creatingBiz ? "Creating…" : "Create Business"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // If we're on a business-specific route, show the real dashboard
  if (businessId) {
    const liveStats = [
      {
        title: "Today's Bookings",
        value: statsLoading ? null : (overview?.totalBookings ?? todayAppointments.length).toString(),
        change: overview ? `${overview.bookingsChange >= 0 ? "+" : ""}${overview.bookingsChange}% from avg` : "No data yet",
        icon: Calendar,
        color: "text-appointment-blue",
        bgColor: "bg-appointment-blue/10",
      },
      {
        title: "Revenue Today",
        value: statsLoading ? null : overview ? overview.totalRevenue.toFixed(2) : "0.00",
        change: overview ? `${overview.revenueChange >= 0 ? "+" : ""}${overview.revenueChange}% from avg` : "No revenue yet",
        icon: DollarSign,
        color: "text-status-completed",
        bgColor: "bg-status-completed/10",
      },
      {
        title: "New Clients",
        value: statsLoading ? null : overview ? overview.newClients.toString() : "0",
        change: overview ? `${overview.newClientsChange >= 0 ? "+" : ""}${overview.newClientsChange}% from avg` : "No clients yet",
        icon: Users,
        color: "text-appointment-purple",
        bgColor: "bg-appointment-purple/10",
      },
      {
        title: "Avg Ticket",
        value: statsLoading ? null : overview ? overview.averageTicket.toFixed(2) : "0.00",
        change: overview ? `${overview.averageTicketChange >= 0 ? "+" : ""}${overview.averageTicketChange}% from avg` : "No data yet",
        icon: Star,
        color: "text-appointment-yellow",
        bgColor: "bg-appointment-yellow/10",
      },
    ];

    return (
      <AppLayout>
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening today."
          actions={
            <Link to={`/${businessId}/calendar`}>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                View Calendar
              </Button>
            </Link>
          }
        />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {liveStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {stat.value === null ? (
                    <Skeleton className="h-9 w-16 mb-1" />
                  ) : (
                    <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground font-medium">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Appointments */}
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Upcoming Appointments</CardTitle>
                  <CardDescription className="mt-1">Next appointments for today</CardDescription>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No appointments scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-300 border border-border/30 hover:border-accent/30 hover:shadow-sm group"
                    >
                      <div className="text-sm font-bold text-foreground w-20 bg-accent/10 px-2.5 py-1.5 rounded-lg text-center group-hover:bg-accent/20 transition-colors">
                        {apt.startTime}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{apt.clientName || "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{apt.serviceName}</p>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg">
                        {apt.staffName || "Staff"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                <CardDescription className="mt-1">Common tasks and shortcuts</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/${businessId}/calendar`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col gap-2.5 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 group"
                  >
                    <Calendar className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm">New Booking</span>
                  </Button>
                </Link>
                <Link to={`/${businessId}/clients`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col gap-2.5 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 group"
                  >
                    <Users className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm">Add Client</span>
                  </Button>
                </Link>
                <Link to={`/${businessId}/sales`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col gap-2.5 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 group"
                  >
                    <DollarSign className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm">Quick Sale</span>
                  </Button>
                </Link>
                <Link to={`/${businessId}/analytics`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-5 flex flex-col gap-2.5 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 group"
                  >
                    <TrendingUp className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm">View Reports</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
    );
  }

  // Business selection page (when user has multiple businesses)
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (businesses.length > 1) {
    return (
      <AppLayout>
        <PageHeader
          title="Select Business"
          subtitle="Choose a business to manage"
        />
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {businesses.map((business) => (
              <Card
                key={business.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate(`/${business.id}/calendar`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <Building2 className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{business.name}</CardTitle>
                      {business.category && (
                        <CardDescription className="mt-1">{business.category}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {business.address && (
                    <p className="text-sm text-muted-foreground">{business.address}</p>
                  )}
                  <Button className="w-full mt-4" variant="outline">
                    Manage Business
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Default dashboard (for non-business owners or when no businesses)
  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
        actions={
          <Link to="/calendar">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              View Calendar
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/calendar">
                <Button variant="outline" className="w-full h-auto py-5 flex flex-col gap-2.5 group">
                  <Calendar className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">New Booking</span>
                </Button>
              </Link>
              <Link to="/clients">
                <Button variant="outline" className="w-full h-auto py-5 flex flex-col gap-2.5 group">
                  <Users className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">Add Client</span>
                </Button>
              </Link>
              <Link to="/sales">
                <Button variant="outline" className="w-full h-auto py-5 flex flex-col gap-2.5 group">
                  <DollarSign className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">Quick Sale</span>
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="outline" className="w-full h-auto py-5 flex flex-col gap-2.5 group">
                  <TrendingUp className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
