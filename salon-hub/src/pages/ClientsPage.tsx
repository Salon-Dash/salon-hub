import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, TrendingUp, User, Loader2, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { clientService, ClientWithStats, invitationService, Invitation } from "@/services/clientService";
import { useBusinessId } from "@/hooks/useBusinessId";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentService } from "@/services/appointmentService";
import { useServices } from "@/hooks/useServices";
import { useStaff } from "@/hooks/useStaff";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientWithStats | null>(null);
  const [newClientForm, setNewClientForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [invitationForm, setInvitationForm] = useState({
    serviceId: "",
    staffId: "",
    appointmentDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    notes: "",
  });
  const businessId = useBusinessId();
  const { services } = useServices(businessId);
  const { staff } = useStaff(businessId);

  useEffect(() => {
    loadClients();
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClientsWithAppointments(businessId);
      setClients(data);
    } catch (error: any) {
      console.error("Failed to load clients:", error);
      toast.error(error.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const data = await invitationService.getInvitationsByBusiness(businessId);
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Failed to load invitations:", error);
      // Don't break the page if invitations fail to load
      setInvitations([]);
    }
  };

  const getClientInvitation = (clientId?: number) => {
    if (!clientId) return null;
    return invitations.find(inv => inv.clientId === clientId);
  };

  // Convert pending invitations to client-like structure
  const getPendingClientsFromInvitations = (): ClientWithStats[] => {
    return invitations
      .filter(inv => inv.status === "PENDING")
      .map(inv => {
        // Parse recipient name (may be null for incomplete invitations)
        const nameParts = (inv.recipientName || "").trim().split(" ").filter(Boolean);
        const firstName = nameParts[0] || "Pending";
        const lastName = nameParts.slice(1).join(" ") || null;

        return {
          id: inv.clientId || inv.id * -1, // Use negative ID for non-registered clients
          businessId: inv.businessId,
          firstName,
          lastName,
          email: inv.recipientEmail || null,
          phone: inv.recipientPhone || null,
          birthday: null,
          gender: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          country: null,
          notes: null,
          avatarUrl: null,
          preferredLanguage: null,
          preferredContactMethod: null,
          status: "PENDING",
          allowMarketingEmails: null,
          allowSmsNotifications: null,
          createdAt: inv.createdAt,
          updatedAt: null,
          totalVisits: 0,
          totalSpent: null,
          lastVisitDate: null,
          pendingAppointments: 0,
          confirmedAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
        } as ClientWithStats;
      })
      .filter(pendingClient => {
        // Only include pending clients that are not already in the clients list
        // (i.e., they don't have a registered clientId that matches an existing client)
        return !clients.some(client => 
          pendingClient.id > 0 && client.id === pendingClient.id
        );
      });
  };

  // Combine registered clients with pending clients
  const allClientsWithPending = [
    ...clients,
    ...getPendingClientsFromInvitations()
  ];

  // Filter clients based on search query
  const filteredClients = allClientsWithPending.filter((client) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${client.firstName} ${client.lastName || ""}`.toLowerCase();
    const email = (client.email || "").toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    return fullName.includes(query) || email.includes(query) || phone.includes(query);
  });

  // Calculate stats
  const totalClients = allClientsWithPending.length;
  const totalRevenue = allClientsWithPending.reduce((sum, client) => {
    return sum + (client.totalSpent ? Number(client.totalSpent) : 0);
  }, 0);
  const totalSuccess = allClientsWithPending.reduce((sum, client) => {
    return sum + (client.confirmedAppointments || 0) + (client.completedAppointments || 0);
  }, 0);
  const totalCancelled = allClientsWithPending.reduce((sum, client) => {
    return sum + (client.cancelledAppointments || 0);
  }, 0);
  
  // Count pending clients (invited but not registered)
  const pendingClientsCount = getPendingClientsFromInvitations().length;

  // Format currency
  const formatCurrency = (amount: number | string | null) => {
    const n = typeof amount === "number" ? amount : Number(amount);
    if (amount === null || amount === undefined || Number.isNaN(n)) return "0.00 zł";
    return `${n.toFixed(2)} zł`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  // Get client initials
  const getInitials = (firstName: string, lastName: string | null) => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return `${first}${last}` || "?";
  };

  // Get client full name
  const getFullName = (firstName: string, lastName: string | null) => {
    return `${firstName}${lastName ? ` ${lastName}` : ""}`;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Clients"
        subtitle="View clients who have booked appointments with your business"
        actions={
          <Button 
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all"
            onClick={() => setAddClientDialogOpen(true)}
          >
            <Plus size={16} />
            Add Client
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Enhanced Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search clients by name, email, or phone..." 
              className="pl-10 border-border/60 focus:border-accent/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className={`gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all ${showFilters ? "bg-accent/10 border-accent/40" : ""}`}
            onClick={() => {
              setShowFilters(f => !f);
              if (!showFilters) toast.info("Filters coming soon — use the search box for now");
            }}
          >
            <Filter size={16} />
            Filters
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Clients
              </CardTitle>
              <User className="h-5 w-5 text-appointment-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalClients}</div>
              {pendingClientsCount > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {pendingClientsCount} pending invitation{pendingClientsCount !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Success Book
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalSuccess}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Cancel Book
              </CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{totalCancelled}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-appointment-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(totalRevenue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Clients Table */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Clients will appear here once they book an appointment with your business"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60 bg-gradient-to-r from-muted/50 to-muted/30">
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Client</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Contact</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Visits</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Success</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Cancelled</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Total Spent</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Last Visit</th>
                      <th className="text-left p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, index) => (
                      <tr 
                        key={client.id} 
                        className="border-b border-border/40 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 transition-all duration-300 cursor-pointer group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="ring-2 ring-background group-hover:ring-accent/30 transition-all">
                              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground font-semibold">
                                {getInitials(client.firstName, client.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{getFullName(client.firstName, client.lastName)}</span>
                                {client.totalVisits === 1 && (
                                  <Badge className="bg-status-completed/10 text-status-completed text-[10px] px-1.5 py-0.5">
                                    New
                                  </Badge>
                                )}
                                {(() => {
                                  try {
                                    // Check if this is a pending client (negative ID or status is PENDING)
                                    if (client.id < 0 || client.status === "PENDING") {
                                      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0.5">Pending Invitation</Badge>;
                                    }
                                    const invitation = getClientInvitation(client.id);
                                    if (invitation && invitation.status === "PENDING") {
                                      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0.5">Pending Invitation</Badge>;
                                    }
                                    if (invitation && invitation.status === "ACCEPTED") {
                                      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5">Registered</Badge>;
                                    }
                                    return null;
                                  } catch (e) {
                                    return null;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1.5">
                            {client.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                <Mail size={12} />
                                <span className="truncate max-w-[200px]">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                <Phone size={12} />
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {!client.email && !client.phone && (
                              <span className="text-xs text-muted-foreground">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {client.id < 0 || client.status === "PENDING" ? (
                            <span className="text-xs text-muted-foreground italic">Not registered</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{client.totalVisits}</span>
                              <span className="text-xs text-muted-foreground">visits</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">
                              {(client.confirmedAppointments || 0) + (client.completedAppointments || 0)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-sm font-semibold text-red-600">
                              {client.cancelledAppointments || 0}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {client.id < 0 || client.status === "PENDING" ? (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          ) : (
                            <span className="text-sm font-bold text-status-completed">
                              {formatCurrency(client.totalSpent)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {client.id < 0 || client.status === "PENDING" ? (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(client.lastVisitDate)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {client.id < 0 || client.status === "PENDING" ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-7 text-xs gap-1.5 hover:bg-accent/10 hover:text-accent transition-all"
                                onClick={() => {
                                  // For pending clients, we can resend invitation or view details
                                  toast.info("This client has a pending invitation. They will appear as registered once they complete registration.");
                                }}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Pending
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-7 text-xs gap-1.5 hover:bg-accent/10 hover:text-accent transition-all"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setInvitationDialogOpen(true);
                                }}
                              >
                                <Send className="h-3.5 w-3.5" />
                                Invite
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-accent/10 hover:text-accent transition-all"
                                >
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setDetailClient(client); setClientDetailOpen(true); }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDetailClient(client); setClientDetailOpen(true); }}>
                                  View Appointments
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => toast.info("Client deletion coming soon")}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Invitation Dialog */}
      <Dialog open={invitationDialogOpen} onOpenChange={setInvitationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Appointment Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim() : "client"} to book an appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select
                value={invitationForm.serviceId}
                onValueChange={(value) => setInvitationForm(prev => ({ ...prev, serviceId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Staff *</Label>
              <Select
                value={invitationForm.staffId}
                onValueChange={(value) => setInvitationForm(prev => ({ ...prev, staffId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={invitationForm.appointmentDate}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    placeholder="Start"
                    value={invitationForm.startTime}
                    onChange={(e) => setInvitationForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                  <Input
                    type="time"
                    placeholder="End"
                    value={invitationForm.endTime}
                    onChange={(e) => setInvitationForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Add notes..."
                value={invitationForm.notes}
                onChange={(e) => setInvitationForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setInvitationDialogOpen(false);
                  setSelectedClient(null);
                  setInvitationForm({
                    serviceId: "",
                    staffId: "",
                    appointmentDate: format(new Date(), "yyyy-MM-dd"),
                    startTime: "",
                    endTime: "",
                    notes: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!invitationForm.serviceId || !invitationForm.staffId || !invitationForm.appointmentDate || !invitationForm.startTime || !invitationForm.endTime) {
                    toast.error("Please fill in all required fields");
                    return;
                  }

                  try {
                    const selectedService = services.find(s => s.id.toString() === invitationForm.serviceId);
                    const appointment = await appointmentService.createAppointment({
                      businessId,
                      staffId: parseInt(invitationForm.staffId),
                      serviceId: parseInt(invitationForm.serviceId),
                      clientId: selectedClient?.id,
                      clientName: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim() : undefined,
                      clientEmail: selectedClient?.email || undefined,
                      clientPhone: selectedClient?.phone || undefined,
                      appointmentDate: invitationForm.appointmentDate,
                      startTime: invitationForm.startTime,
                      endTime: invitationForm.endTime,
                      price: selectedService?.price,
                      notes: invitationForm.notes || undefined,
                    });
                    
                    // Automatically send invitation when booking appointment
                    if (selectedClient && (selectedClient.email || selectedClient.phone)) {
                      try {
                        await invitationService.createInvitation(businessId, {
                          clientId: selectedClient.id,
                          recipientName: `${selectedClient.firstName} ${selectedClient.lastName || ""}`.trim(),
                          recipientEmail: selectedClient.email || undefined,
                          recipientPhone: selectedClient.phone || undefined,
                          type: "APPOINTMENT_INVITATION",
                          appointmentId: appointment.id,
                          message: `You have been invited to book an appointment on ${format(new Date(invitationForm.appointmentDate), "MMM d, yyyy")} at ${invitationForm.startTime}. Please register to confirm your appointment.`,
                          expirationDays: 30,
                        });
                        await loadInvitations(); // Refresh invitations
                      } catch (invError: any) {
                        console.error("Failed to create invitation:", invError);
                        // Don't fail the whole operation if invitation fails
                      }
                    }
                    
                    toast.success("Appointment booked and invitation sent! The client will receive a referral code to register.");
                    setInvitationDialogOpen(false);
                    setSelectedClient(null);
                    setInvitationForm({
                      serviceId: "",
                      staffId: "",
                      appointmentDate: format(new Date(), "yyyy-MM-dd"),
                      startTime: "",
                      endTime: "",
                      notes: "",
                    });
                    loadClients(); // Refresh clients list
                  } catch (error: any) {
                    toast.error(error.message || "Failed to send invitation");
                  }
                }}
                disabled={!invitationForm.serviceId || !invitationForm.staffId || !invitationForm.appointmentDate || !invitationForm.startTime || !invitationForm.endTime}
              >
                Send Invitation
              </Button>
            </div>
          </div>
          </DialogContent>
        </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your business. You can send them an invitation after adding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={newClientForm.firstName}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={newClientForm.lastName}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={newClientForm.email}
                onChange={(e) => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+44 123 456 7890"
                value={newClientForm.phone}
                onChange={(e) => setNewClientForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAddClientDialogOpen(false);
                  setNewClientForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newClientForm.firstName.trim()) {
                    toast.error("First name is required");
                    return;
                  }

                  if (!newClientForm.email && !newClientForm.phone) {
                    toast.error("Please provide either email or phone number");
                    return;
                  }

                  try {
                    // Ask if user wants to send invitation before creating client
                    const shouldInvite = window.confirm("Would you like to send an invitation to this client? They will receive a referral code to register. If invitation fails, client will not be created.");
                    
                    const newClient = await clientService.createClient(businessId, {
                      firstName: newClientForm.firstName,
                      lastName: newClientForm.lastName || undefined,
                      email: newClientForm.email || undefined,
                      phone: newClientForm.phone || undefined,
                      sendInvitation: shouldInvite, // Pass invitation flag - backend will handle it transactionally
                    });
                    
                    if (shouldInvite) {
                      toast.success("Client added and invitation sent successfully! The invitation will show as 'Pending' until the client registers.");
                    } else {
                      toast.success("Client added successfully!");
                    }
                    
                    setAddClientDialogOpen(false);
                    setNewClientForm({
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                    });
                    
                    // Reload clients list and invitations
                    loadClients();
                    if (shouldInvite) {
                      await loadInvitations();
                    }
                  } catch (error: any) {
                    toast.error(error.message || "Failed to add client. If invitation was requested, it may have failed.");
                  }
                }}
                disabled={!newClientForm.firstName.trim() || (!newClientForm.email && !newClientForm.phone)}
              >
                Add Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={clientDetailOpen} onOpenChange={setClientDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              {detailClient ? getFullName(detailClient.firstName, detailClient.lastName) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailClient && (
            <div className="space-y-3 py-2">
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Email:</span><span>{detailClient.email || "N/A"}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Phone:</span><span>{detailClient.phone || "N/A"}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Status:</span><span>{detailClient.status || "Active"}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Total Visits:</span><span>{detailClient.totalVisits ?? 0}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Total Spent:</span><span>{formatCurrency(detailClient.totalSpent)}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Last Visit:</span><span>{formatDate(detailClient.lastVisitDate)}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Completed:</span><span>{detailClient.completedAppointments ?? 0}</span></div>
              <div className="flex gap-2 text-sm"><span className="font-medium w-28">Cancelled:</span><span>{detailClient.cancelledAppointments ?? 0}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
