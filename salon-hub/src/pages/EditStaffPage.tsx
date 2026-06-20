import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Search,
  HelpCircle,
  UserPlus,
  ChevronRight,
  User,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStaff } from "@/hooks/useStaff";
import { useServices } from "@/hooks/useServices";
import { staffService } from "@/services/staffService";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useNavigation } from "@/utils/navigationUtils";

export default function EditStaffPage() {
  const navigate = useNavigate();
  const { getPath } = useNavigation();
  const { id } = useParams<{ id: string }>();
  const businessId = useBusinessId();
  const { updateStaff, loading: updating } = useStaff(businessId);
  const { services, loading: servicesLoading } = useServices(businessId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    permissionLevel: "",
    position: "",
    showInCalendar: true,
    availableForOnlineBooking: true,
    description: "",
  });

  // Load staff data
  useEffect(() => {
    const loadStaff = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const staff = await staffService.getStaffById(Number(id), businessId);
        setFormData({
          name: staff.name,
          phone: staff.phone || "",
          email: staff.email || "",
          permissionLevel: "Owner", // Default, adjust based on your permission system
          position: staff.position || "",
          showInCalendar: staff.canBookAppointments || false,
          availableForOnlineBooking: staff.canBookAppointments || false,
          description: "",
        });
        setSelectedServiceIds(staff.serviceIds || []);
      } catch (error) {
        console.error("Failed to load staff:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStaff();
  }, [id, businessId]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateStaff(Number(id), {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        position: formData.position || undefined,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
        isActive: formData.showInCalendar,
      });
      navigate(getPath("staff"));
    } catch (error) {
      console.error("Failed to update staff:", error);
    }
  };

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.categoryName || "Not categorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Edit Staff Member
              </h1>
            </div>
            <Button 
              onClick={handleSave} 
              size="sm" 
              className="bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!formData.name.trim() || updating || loading}
            >
              {updating ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  SAVING...
                </>
              ) : (
                "SAVE"
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Panel - Staff Member Details */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-2xl font-medium">
                          {getInitials(formData.name)}
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors">
                        <UserPlus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* E-mail */}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>

                  {/* Invite Again */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      INVITE AGAIN
                    </Button>
                    <HelpCircle size={16} className="text-gray-400" />
                  </div>

                  {/* Permission Level */}
                  <div className="space-y-2">
                    <Label htmlFor="permission-level">Permission Level</Label>
                    <div className="relative">
                      <Select
                        value={formData.permissionLevel}
                        onValueChange={(value) =>
                          handleInputChange("permissionLevel", value)
                        }
                      >
                        <SelectTrigger id="permission-level" className="pr-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <ChevronRight
                        size={16}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange("position", e.target.value)}
                      placeholder="Enter position"
                    />
                  </div>

                  {/* Show Staff Member in Calendar */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="show-in-calendar"
                      checked={formData.showInCalendar}
                      onCheckedChange={(checked) =>
                        handleInputChange("showInCalendar", checked as boolean)
                      }
                      className="mt-1"
                    />
                    <Label
                      htmlFor="show-in-calendar"
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      Check the box if the Staff Member offers services and
                      should be visible in your Booksy Calendar.
                    </Label>
                  </div>

                  {/* Available for Online Booking */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="online-booking"
                      checked={formData.availableForOnlineBooking}
                      onCheckedChange={(checked) =>
                        handleInputChange(
                          "availableForOnlineBooking",
                          checked as boolean
                        )
                      }
                      className="mt-1"
                    />
                    <Label
                      htmlFor="online-booking"
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      Check the box to allow clients to book services with
                      this Staff Member online.
                    </Label>
                  </div>

                  {/* Staffer description */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description">Staffer description</Label>
                      <HelpCircle size={16} className="text-gray-400" />
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Enter description..."
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel - Services Management */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                  {/* Services Tab */}
                  <div className="border-b border-gray-200">
                    <button className="px-4 py-3 text-sm font-medium border-b-2 border-gray-900 text-gray-900">
                      SERVICES
                    </button>
                  </div>

                  {/* Search Services */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <Input
                      type="text"
                      placeholder="Search services..."
                      className="pl-10"
                    />
                  </div>

                  {/* Services by Category */}
                  {servicesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto">
                      {Object.entries(servicesByCategory).map(
                        ([category, categoryServices]) => (
                          <div key={category} className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase">
                              {category}
                            </h3>
                            <div className="space-y-2">
                              {categoryServices.map((service) => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                const colorClass = service.color?.startsWith("#") ? "" : (service.color?.startsWith("bg-") ? service.color : "bg-gray-400");
                                const colorStyle = service.color?.startsWith("#") ? { backgroundColor: service.color } : {};
                                
                                return (
                                  <div
                                    key={service.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                    onClick={() => handleServiceToggle(service.id)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleServiceToggle(service.id)}
                                      className="h-5 w-5"
                                    />
                                    <div
                                      className={`w-1 h-12 rounded-full ${colorClass}`}
                                      style={colorStyle}
                                    />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">
                                        {service.name}
                                      </h4>
                                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                        <span>
                                          {service.durationMinutes
                                            ? `${Math.floor(service.durationMinutes / 60)}h ${service.durationMinutes % 60}min`
                                            : "N/A"}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                          {service.price ? `${service.price.toFixed(2)} zł` : "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Edit Services Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button variant="outline" className="w-full">
                      EDIT SERVICES
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



