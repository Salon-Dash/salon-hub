import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  HelpCircle,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Image as ImageIcon,
  Plus,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useServices } from "@/hooks/useServices";
import { useCategories } from "@/hooks/useCategories";
import { useStaff } from "@/hooks/useStaff";
import { useNavigation } from "@/utils/navigationUtils";
import { toast } from "sonner";

const sidebarItems = [
  { id: "general", label: "GENERAL", active: true },
  { id: "staff", label: "STAFF" },
  { id: "settings", label: "SETTINGS" },
  { id: "for-client", label: "FOR CLIENT" },
];

export default function AddServicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { getPath, businessId } = useNavigation();
  const isEditMode = !!id;
  const { services, createService, updateService, loading: creating } = useServices();
  const { categories, loading: categoriesLoading } = useCategories();
  const { staff, loading: staffLoading } = useStaff();
  
  // Verify businessId is available
  useEffect(() => {
    if (!businessId || businessId <= 0) {
      toast.error("Business ID is missing. Please ensure you are accessing this page from a business context.");
      console.error("Business ID is missing:", businessId);
    }
  }, [businessId]);
  const [activeSidebarItem, setActiveSidebarItem] = useState("general");
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [settingsData, setSettingsData] = useState({
    allowSelfBooking: true,
    mobileService: false,
    virtualAppointments: false,
    bookingIntervalHours: "0",
    bookingIntervalMinutes: "15",
    paddingTimeRule: "-",
    paddingTimeMinutes: "Not set",
    paddingTimeBeforeHours: "0",
    paddingTimeBeforeMinutes: "0",
    paddingTimeAfterHours: "0",
    paddingTimeAfterMinutes: "0",
    processingTimeDuringHours: "0",
    processingTimeDuringMinutes: "0",
    processingTimeAfterHours: "0",
    processingTimeAfterMinutes: "0",
    parallelClients: "Not allowed",
    taxRate: "23%",
  });
  const [clientData, setClientData] = useState({
    messageToClient: "",
    questions: [] as string[],
  });
  const [formData, setFormData] = useState({
    serviceName: "",
    serviceType: "standard",
    durationHours: "0",
    durationMinutes: "30",
    priceType: "FIXED",
    price: "",
    categoryId: "none",
    description: "",
    color: "#3b82f6", // Default blue color
  });

  // Ensure arrays are never undefined - defensive programming
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeStaff = Array.isArray(staff) ? staff : [];
  
  // Ensure createService and updateService are functions
  const safeCreateService = typeof createService === 'function' ? createService : async () => {
    console.error('createService is not available');
    throw new Error('Service creation is not available');
  };
  const safeUpdateService = typeof updateService === 'function' ? updateService : async () => {
    console.error('updateService is not available');
    throw new Error('Service update is not available');
  };

  // Load service data if in edit mode
  useEffect(() => {
    if (isEditMode && id && services.length > 0) {
      const service = services.find(s => s.id.toString() === id);
      if (service) {
        const hours = Math.floor((service.durationMinutes || 0) / 60);
        const minutes = (service.durationMinutes || 0) % 60;
        setFormData({
          serviceName: service.name || "",
          // Re-populate the Service Type dropdown on edit. Legacy/empty values
          // (e.g. the old hardcoded "SERVICE") fall back to "standard" so the
          // Select always shows a valid option instead of a blank.
          serviceType: ["standard", "package", "course"].includes(service.serviceType || "")
            ? (service.serviceType as string)
            : "standard",
          durationHours: hours.toString(),
          durationMinutes: minutes.toString(),
          priceType: service.priceType || "FIXED",
          price: service.price?.toString() || "",
          categoryId: service.categoryId?.toString() || "none",
          description: service.description || "",
          color: service.color || "#3b82f6",
        });
        // Load staff IDs linked to this service
        if (service.staffIds && service.staffIds.length > 0) {
          setSelectedStaff(service.staffIds);
        } else {
          setSelectedStaff([]);
        }
      }
    }
  }, [isEditMode, id, services]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.serviceName.trim()) {
        toast.error("Service name is required");
        return;
      }

      const durationMinutes = parseInt(formData.durationHours) * 60 + parseInt(formData.durationMinutes);
      const serviceData = {
        name: formData.serviceName,
        description: formData.description || undefined,
        durationMinutes: durationMinutes || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceType: formData.priceType as 'FIXED' | 'FROM' | 'RANGE',
        serviceType: formData.serviceType || 'standard',
        color: formData.color || undefined,
        categoryId: formData.categoryId && formData.categoryId !== "none" ? parseInt(formData.categoryId) : undefined,
        staffIds: selectedStaff, // Always send staffIds array (even if empty) so backend can update relationships
      };
      
      if (isEditMode && id) {
        await safeUpdateService(parseInt(id), serviceData);
        toast.success("Service updated successfully");
      } else {
        await safeCreateService(serviceData);
        toast.success("Service created successfully");
      }
      navigate(getPath("items-category"));
    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} service:`, error);
      const errorMessage = error?.response?.data?.message || error?.message || `Failed to ${isEditMode ? 'update' : 'create'} service`;
      toast.error(errorMessage);
    }
  };

  const handleSaveAndAddNext = async () => {
    if (isEditMode) {
      // In edit mode, just save and go back
      await handleSave();
      return;
    }
    try {
      // Validate required fields
      if (!formData.serviceName.trim()) {
        toast.error("Service name is required");
        return;
      }

      const durationMinutes = parseInt(formData.durationHours) * 60 + parseInt(formData.durationMinutes);
      await safeCreateService({
        name: formData.serviceName,
        description: formData.description || undefined,
        durationMinutes: durationMinutes || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceType: formData.priceType as 'FIXED' | 'FROM' | 'RANGE',
        serviceType: formData.serviceType || 'standard',
        color: formData.color || undefined,
        categoryId: formData.categoryId && formData.categoryId !== "none" ? parseInt(formData.categoryId) : undefined,
        staffIds: selectedStaff, // Always send staffIds array (even if empty) so backend can update relationships
      });
      toast.success("Service created successfully");
      // Reset form for next service
      setFormData({
        serviceName: "",
        serviceType: "standard",
        durationHours: "0",
        durationMinutes: "30",
        priceType: "FIXED",
        price: "",
        categoryId: "none",
        description: "",
        color: "#3b82f6",
      });
      setSelectedStaff([]);
    } catch (error: any) {
      console.error("Failed to create service:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create service";
      toast.error(errorMessage);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && safeStaff.length > 0) {
      setSelectedStaff(safeStaff.map(s => s.id));
    } else {
      setSelectedStaff([]);
    }
  };

  const handleStaffToggle = (staffId: number) => {
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const isAllSelected = safeStaff.length > 0 && selectedStaff.length === safeStaff.length;

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(getPath("items-category"))}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">{isEditMode ? "Edit Service" : "Add Service"}</h1>
            </div>
            <div className="flex items-center gap-3">
              {!isEditMode && (
                <Button
                  variant="outline"
                  onClick={handleSaveAndAddNext}
                  className="bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300"
                >
                  SAVE & ADD NEXT SERVICE
                </Button>
              )}
              <Button
                onClick={handleSave}
                className="bg-gray-900 text-white hover:bg-gray-800"
                disabled={!formData.serviceName.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    {isEditMode ? "UPDATING..." : "SAVING..."}
                  </>
                ) : (
                  isEditMode ? "UPDATE SERVICE" : "SAVE SERVICE"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <div className="p-4 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSidebarItem(item.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeSidebarItem === item.id
                      ? "text-gray-900 bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {activeSidebarItem === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area - Form */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {activeSidebarItem === "general" ? (
              <div className="max-w-3xl space-y-8 bg-white p-6 rounded-lg shadow-sm">
              {/* Main details (required) section */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Main details (required)
                </h2>

                {/* Service Name */}
                <div className="space-y-2">
                  <Label htmlFor="serviceName" className="text-sm font-medium text-gray-700">
                    Service Name
                  </Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName}
                    onChange={(e) => handleInputChange("serviceName", e.target.value)}
                    placeholder="Enter service name"
                    className="w-full"
                  />
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="serviceType" className="text-sm font-medium text-gray-700">
                      Service Type
                    </Label>
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                  </div>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => handleInputChange("serviceType", value)}
                  >
                    <SelectTrigger id="serviceType" className="w-full">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="package">Package</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Duration</Label>
                  <div className="flex items-center gap-3">
                    <Select
                      value={formData.durationHours}
                      onValueChange={(value) => handleInputChange("durationHours", value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">hour(s)</span>
                    <Select
                      value={formData.durationMinutes}
                      onValueChange={(value) => handleInputChange("durationMinutes", value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((min) => (
                          <SelectItem key={min} value={min.toString()}>
                            {min}min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                </div>

                {/* Price type and Price */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Price type</Label>
                  <div className="flex items-center gap-3">
                    <Select
                      value={formData.priceType}
                      onValueChange={(value) => handleInputChange("priceType", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="FROM">From</SelectItem>
                        <SelectItem value="RANGE">Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">zł</span>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      placeholder="Price"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Additional details section */}
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Additional details</h2>

                {/* Service Category */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Service Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleInputChange("categoryId", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not categorized</SelectItem>
                      {safeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Color */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Service Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange("color", e.target.value)}
                        className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                        title="Select color"
                      />
                    </div>
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Validate hex color format
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === "") {
                          handleInputChange("color", value);
                        }
                      }}
                      placeholder="#000000"
                      className="flex-1 font-mono text-sm"
                      maxLength={7}
                    />
                    <div
                      className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: formData.color }}
                      title="Color preview"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This color will be used to display appointments for this service in the calendar
                  </p>
                </div>

                {/* Text Editor Toolbar */}
                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <Bold size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <Italic size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <Strikethrough size={16} className="text-gray-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-300" />
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <List size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <ListOrdered size={16} className="text-gray-600" />
                  </button>
                </div>

                {/* Service Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Service Description
                  </Label>
                  <div className="relative">
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Enter service description..."
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                    />
                    <button className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      <ImageIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ) : activeSidebarItem === "staff" ? (
              <div className="max-w-3xl bg-white rounded-lg shadow-sm">
                <div className="p-6">
                  {/* Select All */}
                  <div className="flex items-center gap-3 py-4 border-b border-gray-200">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="h-5 w-5 border-gray-400 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                    />
                    <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                      Select All ({selectedStaff.length})
                    </Label>
                  </div>

                  {/* Staff List */}
                  <div className="divide-y divide-gray-200">
                    {staffLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : safeStaff.length > 0 ? (
                      safeStaff.map((staffMember) => {
                        const isSelected = selectedStaff.includes(staffMember.id);
                        const initials = staffMember.initials || (staffMember.name || "").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
                        return (
                          <div
                            key={staffMember.id}
                            className="flex items-center gap-3 py-4"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleStaffToggle(staffMember.id)}
                              className="h-5 w-5 border-gray-400 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                            />
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-gray-700">
                                {initials}
                              </span>
                            </div>
                            <Label className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                              {staffMember.name}
                            </Label>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-gray-500 text-sm">
                        No staff members available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeSidebarItem === "settings" ? (
              <div className="max-w-3xl bg-white rounded-lg shadow-sm">
                <div className="p-6 space-y-6">
                  {/* Allow self-booking */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                        Allow self-booking
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <Switch
                      checked={settingsData.allowSelfBooking}
                      onCheckedChange={(checked) =>
                        setSettingsData((prev) => ({ ...prev, allowSelfBooking: checked }))
                      }
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>

                  {/* Mobile Service */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                        Mobile Service
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <Switch
                      checked={settingsData.mobileService}
                      onCheckedChange={(checked) =>
                        setSettingsData((prev) => ({ ...prev, mobileService: checked }))
                      }
                    />
                  </div>

                  {/* Virtual Appointments */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                        Virtual Appointments
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <Switch
                      checked={settingsData.virtualAppointments}
                      onCheckedChange={(checked) =>
                        setSettingsData((prev) => ({ ...prev, virtualAppointments: checked }))
                      }
                    />
                  </div>

                  {/* Booking Intervals */}
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Booking Intervals
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={settingsData.bookingIntervalHours}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, bookingIntervalHours: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">hour...</span>
                      <Select
                        value={settingsData.bookingIntervalMinutes}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, bookingIntervalMinutes: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem key={min} value={min.toString()}>
                              {min}min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">minutes</span>
                    </div>
                  </div>

                  {/* Padding Time */}
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">Padding Time</Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Select
                          value={settingsData.paddingTimeRule}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeRule: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">-</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">Rule</span>
                        <Select
                          value={settingsData.paddingTimeMinutes}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeMinutes: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not set">Not set</SelectItem>
                            <SelectItem value="5">5min</SelectItem>
                            <SelectItem value="10">10min</SelectItem>
                            <SelectItem value="15">15min</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={settingsData.paddingTimeBeforeHours}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeBeforeHours: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">hour...</span>
                        <Select
                          value={settingsData.paddingTimeBeforeMinutes}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeBeforeMinutes: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map((min) => (
                              <SelectItem key={min} value={min.toString()}>
                                {min}min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-20">after</span>
                        <Select
                          value={settingsData.paddingTimeAfterHours}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeAfterHours: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">hour...</span>
                        <Select
                          value={settingsData.paddingTimeAfterMinutes}
                          onValueChange={(value) =>
                            setSettingsData((prev) => ({ ...prev, paddingTimeAfterMinutes: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map((min) => (
                              <SelectItem key={min} value={min.toString()}>
                                {min}min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    </div>
                  </div>

                  {/* Processing time during the service */}
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Processing time during the service
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={settingsData.processingTimeDuringHours}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, processingTimeDuringHours: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">hour...</span>
                      <Select
                        value={settingsData.processingTimeDuringMinutes}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, processingTimeDuringMinutes: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem key={min} value={min.toString()}>
                              {min}min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">minutes</span>
                    </div>
                  </div>

                  {/* Processing time after the service */}
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Processing time after the service
                      </Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={settingsData.processingTimeAfterHours}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, processingTimeAfterHours: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">hour...</span>
                      <Select
                        value={settingsData.processingTimeAfterMinutes}
                        onValueChange={(value) =>
                          setSettingsData((prev) => ({ ...prev, processingTimeAfterMinutes: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45].map((min) => (
                            <SelectItem key={min} value={min.toString()}>
                              {min}min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">minutes</span>
                    </div>
                  </div>

                  {/* Parallel Clients */}
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">Parallel Clients</Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <Select
                      value={settingsData.parallelClients}
                      onValueChange={(value) =>
                        setSettingsData((prev) => ({ ...prev, parallelClients: value }))
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not allowed">Not allowed</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="Unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tax Rate */}
                  <div className="py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-sm font-medium text-gray-900">Tax Rate</Label>
                      <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    </div>
                    <Select
                      value={settingsData.taxRate}
                      onValueChange={(value) =>
                        setSettingsData((prev) => ({ ...prev, taxRate: value }))
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0%">0%</SelectItem>
                        <SelectItem value="5%">5%</SelectItem>
                        <SelectItem value="8%">8%</SelectItem>
                        <SelectItem value="23%">23%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : activeSidebarItem === "for-client" ? (
              <div className="max-w-3xl bg-white rounded-lg shadow-sm">
                <div className="p-6 space-y-8">
                  {/* Message to Client */}
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900">Message to Client</h2>
                    <div className="space-y-2">
                      <textarea
                        value={clientData.messageToClient}
                        onChange={(e) =>
                          setClientData((prev) => ({ ...prev, messageToClient: e.target.value }))
                        }
                        placeholder="E.g. Please do not eat 1 hour before the appointment."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y"
                      />
                      <p className="text-sm text-gray-500">
                        This message will be sent to your client before the appointment.
                      </p>
                    </div>
                  </div>

                  {/* Questions to Client */}
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900">Questions to Client</h2>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setClientData((prev) => ({
                          ...prev,
                          questions: [...prev.questions, ""],
                        }));
                      }}
                      className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                    >
                      <Plus size={16} />
                      Add Question
                    </Button>
                    {clientData.questions.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {clientData.questions.map((question, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <Input
                              value={question}
                              onChange={(e) => {
                                const newQuestions = [...clientData.questions];
                                newQuestions[index] = e.target.value;
                                setClientData((prev) => ({ ...prev, questions: newQuestions }));
                              }}
                              placeholder="Enter your question..."
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newQuestions = clientData.questions.filter(
                                  (_, i) => i !== index
                                );
                                setClientData((prev) => ({ ...prev, questions: newQuestions }));
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl bg-white rounded-lg shadow-sm p-6">
                <p className="text-gray-500">
                  {sidebarItems.find((item) => item.id === activeSidebarItem)?.label} section coming soon...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

