import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  UserPlus,
  ChevronRight,
  Send,
  Layers,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useStaff } from "@/hooks/useStaff";
import { useServices } from "@/hooks/useServices";
import { serviceService } from "@/services/serviceService";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useNavigation } from "@/utils/navigationUtils";
import { toast } from "sonner";
import {
  WorkingHoursEditor,
  DEFAULT_WEEK,
  scheduleToPayload,
  type WeekSchedule,
} from "@/components/staff/WorkingHoursEditor";

export default function AddStaffPage() {
  const navigate = useNavigate();
  const { getPath } = useNavigation();
  const businessId = useBusinessId();
  const { createStaff, loading: creating } = useStaff();
  const { services, loading: servicesLoading } = useServices();
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_WEEK);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    inviteAndCreateAccount: true,
    permissionLevel: "",
    position: "",
    showInCalendar: true,
    availableForOnlineBooking: true,
  });

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

  const handleAddAndSendInvite = async () => {
    // Email format validation
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      toast.error("Invalid email address format");
      return;
    }
    // Name length check
    if (formData.name && formData.name.length > 255) {
      toast.error("Name is too long (max 255 characters)");
      return;
    }

    try {
      const created = await createStaff({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        position: formData.position || undefined,
        inviteAndCreateAccount: formData.inviteAndCreateAccount,
        schedule: scheduleToPayload(schedule),
      });
      // Persist the staff↔service assignments (owned by service-catalog).
      if (created?.id && selectedServiceIds.length > 0) {
        await serviceService.setStaffServiceIds(businessId, created.id, selectedServiceIds);
      }
      navigate(getPath("staff"));
    } catch (error: any) {
      console.error("Failed to create staff:", error);
      toast.error(error.message || "Failed to create staff member");
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
              <h1 className="text-xl font-bold text-white">
                Add New Staff Member
              </h1>
            </div>
            <Button
              onClick={handleAddAndSendInvite}
              size="sm"
              className="bg-gray-800 hover:bg-gray-700 text-white gap-2"
              disabled={!formData.name.trim() || creating}
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  CREATING...
                </>
              ) : (
                <>
                  <Send size={16} />
                  ADD AND SEND INVITE
                </>
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
                          <UserPlus size={32} />
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
                      placeholder="Enter name"
                      autoFocus
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
                      placeholder="Enter email"
                    />
                  </div>

                  {/* Invite and create Booksy account? */}
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="invite-account" className="text-sm font-medium">
                        Invite and create Booksy account?
                      </Label>
                      <Switch
                        id="invite-account"
                        checked={formData.inviteAndCreateAccount}
                        onCheckedChange={(checked) =>
                          handleInputChange("inviteAndCreateAccount", checked)
                        }
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      We'll send them a link to download the Booksy app so that
                      they can start managing their calendar.
                    </p>
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
                          <SelectValue placeholder="Select permission level" />
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
                </div>
              </div>

              {/* Right Panel - Services Management */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 min-h-[600px] flex flex-col">
                  {/* Services Tab */}
                  <div className="border-b border-gray-200">
                    <button className="px-4 py-3 text-sm font-medium border-b-2 border-gray-900 text-gray-900">
                      SERVICES
                    </button>
                  </div>

                  {/* Services List */}
                  {servicesLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600">Loading services...</p>
                    </div>
                  ) : !services || services.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <div className="mb-4">
                        <Layers size={64} className="text-gray-300 mx-auto" />
                      </div>
                      <p className="text-sm text-gray-600 mb-6 max-w-xs">
                        No services available. Create services first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {services.map((service) => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                handleServiceToggle(service.id);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="h-5 w-5"
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
                  )}
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Working hours</h3>
              <p className="text-xs text-gray-600 mb-4">
                Clients can only book this staff member during these hours. Turn a day off to mark it closed.
              </p>
              <WorkingHoursEditor value={schedule} onChange={setSchedule} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



