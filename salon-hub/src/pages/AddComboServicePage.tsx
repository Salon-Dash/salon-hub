import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useServices } from "@/hooks/useServices";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";
import { serviceService } from "@/services/serviceService";
import { useNavigation } from "@/utils/navigationUtils";

const sidebarItems = [
  { id: "general", label: "GENERAL" },
  { id: "services", label: "SERVICES" },
  { id: "pricing", label: "PRICING" },
];

interface ComboService {
  id: string;
  serviceId: number;
  name: string;
  durationMinutes?: number;
  price?: number;
  color?: string;
  timeBetweenHours?: string;
  timeBetweenMinutes?: string;
  priceType?: string;
  priceValue?: string;
}

export default function AddComboServicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { getPath } = useNavigation();
  const isEditMode = !!id;
  const { services, loading: servicesLoading, createService, updateService } = useServices();
  const { categories } = useCategories();
  const [activeSidebarItem, setActiveSidebarItem] = useState("general");
  const [bookingType, setBookingType] = useState("sequence");
  const [pricingType, setPricingType] = useState("custom");
  const [comboServices, setComboServices] = useState<ComboService[]>([]);
  const [formData, setFormData] = useState({
    comboName: "",
    categoryId: "none",
    description: "",
    allowOnlineBooking: true,
    comboPriceType: "FIXED",
    comboPrice: "",
    color: "#9333ea", // Default purple color for combo services
  });

  // Load combo service data if in edit mode
  useEffect(() => {
    const loadComboServiceData = async () => {
      if (isEditMode && id) {
        // Wait for services to load if not already loaded
        if (services.length === 0 && !servicesLoading) {
          // Services might still be loading, wait a bit
          return;
        }
        
        const service = services.find(s => s.id.toString() === id && s.serviceType === 'COMBO');
        if (service) {
          setFormData({
            comboName: service.name || "",
            categoryId: service.categoryId?.toString() || "none",
            description: service.description || "",
            allowOnlineBooking: true, // TODO: Load from service if available
            comboPriceType: service.priceType || "FIXED",
            comboPrice: service.price?.toString() || "",
            color: service.color || "#9333ea",
          });
          
          // Load combo service items
          try {
            console.log("Loading combo service items for combo service ID:", id);
            const comboItems = await serviceService.getComboServiceItems(parseInt(id));
            console.log("Loaded combo items:", comboItems);
            console.log("Available services:", services);
            
            const loadedServices: ComboService[] = comboItems.map((item, index) => {
              // Try to find service in the services array, or use the serviceName from the API
              const serviceData = services.find(s => s.id === item.serviceId);
              console.log(`Finding service for item ${item.serviceId}:`, serviceData);
              const timeBetweenTotal = item.timeBetweenMinutes || 0;
              const hours = Math.floor(timeBetweenTotal / 60);
              const minutes = timeBetweenTotal % 60;
              
              const comboService: ComboService = {
                id: `combo-${item.serviceId}-${index}`,
                serviceId: item.serviceId,
                name: item.serviceName || serviceData?.name || `Service ${item.serviceId}`,
                durationMinutes: serviceData?.durationMinutes,
                price: serviceData?.price,
                color: serviceData?.color || "#9333ea",
                timeBetweenHours: hours > 0 ? hours.toString() : "0",
                timeBetweenMinutes: minutes > 0 ? minutes.toString() : "0",
              };
              
              console.log(`Created combo service item:`, comboService);
              return comboService;
            });
            console.log("Setting combo services (total:", loadedServices.length, "):", loadedServices);
            if (loadedServices.length > 0) {
              setComboServices(loadedServices);
              
              // Determine pricing type: if price matches sum of service prices, it's "sum", otherwise "custom"
              const sumOfServices = loadedServices.reduce((sum, cs) => {
                return sum + (cs.price ? Number(cs.price) : 0);
              }, 0);
              const servicePrice = service.price ? Number(service.price) : 0;
              
              console.log("Determining pricing type - Service price:", servicePrice, "Sum of services:", sumOfServices);
              
              // Check if price matches sum (with small tolerance for floating point)
              // Also check if price is 0 or undefined - if so, default to custom
              if (servicePrice > 0 && sumOfServices > 0 && Math.abs(servicePrice - sumOfServices) < 0.01) {
                setPricingType("sum");
                console.log("Pricing type set to 'sum' (price matches sum of services:", servicePrice, "==", sumOfServices, ")");
              } else {
                setPricingType("custom");
                console.log("Pricing type set to 'custom' (price:", servicePrice, "sum:", sumOfServices, ")");
              }
            } else {
              console.warn("No combo services loaded, but comboItems had", comboItems.length, "items");
              // Default to custom if no services
              setPricingType("custom");
            }
          } catch (error) {
            console.error("Failed to load combo service items:", error);
            toast.error("Failed to load combo service items");
            // Default to custom on error
            setPricingType("custom");
          }
        }
      }
    };
    
    loadComboServiceData();
  }, [isEditMode, id, services, servicesLoading]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddService = (serviceId: number) => {
    const service = services.find((s) => s.id === serviceId);
    if (service && !comboServices.some((cs) => cs.serviceId === serviceId)) {
      setComboServices([
        ...comboServices,
        {
          id: Date.now().toString(),
          serviceId: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          color: service.color,
          priceType: service.priceType || "FIXED",
          priceValue: service.price?.toString() || "",
        },
      ]);
    }
  };

  const handleRemoveService = (id: string) => {
    setComboServices(comboServices.filter((s) => s.id !== id));
  };

  const handleUpdateServiceTime = (
    id: string,
    field: "timeBetweenHours" | "timeBetweenMinutes",
    value: string
  ) => {
    setComboServices(
      comboServices.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  const handleRemoveTimeBetween = (id: string) => {
    setComboServices(
      comboServices.map((s) =>
        s.id === id
          ? { ...s, timeBetweenHours: undefined, timeBetweenMinutes: undefined }
          : s
      )
    );
  };

  const handleAddTimeBetween = (id: string) => {
    setComboServices(
      comboServices.map((s) =>
        s.id === id
          ? { ...s, timeBetweenHours: "0", timeBetweenMinutes: "0" }
          : s
      )
    );
  };

  const handleUpdateServicePrice = (
    id: string,
    field: "priceType" | "priceValue",
    value: string
  ) => {
    setComboServices(
      comboServices.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  const calculateComboPrice = () => {
    if (pricingType === "sum") {
      const total = comboServices.reduce((sum, cs) => {
        const service = services.find(s => s.id === cs.serviceId);
        return sum + (service?.price ? Number(service.price) : 0);
      }, 0);
      return total.toFixed(2);
    }
    return formData.comboPrice || "0.00";
  };

  const calculateComboDuration = () => {
    if (comboServices.length === 0) return "0min";
    
    if (bookingType === "parallel") {
      // For parallel: duration is the maximum (longest) service duration
      const maxDuration = comboServices.reduce((max, cs) => {
        const service = services.find(s => s.id === cs.serviceId);
        const serviceDuration = service?.durationMinutes || 0;
        return Math.max(max, serviceDuration);
      }, 0);

      const hours = Math.floor(maxDuration / 60);
      const minutes = maxDuration % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}min`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else if (minutes > 0) {
        return `${minutes}min`;
      }
      return "0min";
    } else {
      // For sequence: sum all service durations + time between services
      const totalMinutes = comboServices.reduce((sum, cs, index) => {
        const service = services.find(s => s.id === cs.serviceId);
        const serviceDuration = service?.durationMinutes || 0;
        
        // Add service duration
        let duration = sum + serviceDuration;
        
        // Add time between services (not for the last service)
        if (index < comboServices.length - 1 && cs.timeBetweenHours !== undefined && cs.timeBetweenMinutes !== undefined) {
          const timeBetweenHours = parseInt(cs.timeBetweenHours || "0");
          const timeBetweenMinutes = parseInt(cs.timeBetweenMinutes || "0");
          const timeBetweenTotal = timeBetweenHours * 60 + timeBetweenMinutes;
          duration += timeBetweenTotal;
        }
        
        return duration;
      }, 0);

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}min`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else if (minutes > 0) {
        return `${minutes}min`;
      }
      return "0min";
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.comboName.trim()) {
        toast.error("Please enter a combo service name");
        return;
      }
      
      if (comboServices.length === 0) {
        toast.error("Please add at least one service to the combo");
        return;
      }
      
      // Calculate total duration based on booking type
      let totalDuration: number;
      
      if (bookingType === "parallel") {
        // For parallel: duration is the maximum (longest) service duration
        totalDuration = comboServices.reduce((max, cs) => {
          const service = services.find(s => s.id === cs.serviceId);
          const serviceDuration = service?.durationMinutes || 0;
          return Math.max(max, serviceDuration);
        }, 0);
      } else {
        // For sequence: sum all service durations + time between services
        totalDuration = comboServices.reduce((sum, cs, index) => {
          const service = services.find(s => s.id === cs.serviceId);
          const serviceDuration = service?.durationMinutes || 0;
          
          // Add service duration
          let duration = sum + serviceDuration;
          
          // Add time between services (not for the last service)
          if (index < comboServices.length - 1 && cs.timeBetweenHours !== undefined && cs.timeBetweenMinutes !== undefined) {
            const timeBetweenHours = parseInt(cs.timeBetweenHours || "0");
            const timeBetweenMinutes = parseInt(cs.timeBetweenMinutes || "0");
            const timeBetweenTotal = timeBetweenHours * 60 + timeBetweenMinutes;
            duration += timeBetweenTotal;
          }
          
          return duration;
        }, 0);
      }
      
      // Calculate price based on pricing type
      let finalPrice: number | undefined;
      if (pricingType === "sum") {
        const calculatedPrice = comboServices.reduce((sum, cs) => {
          const service = services.find(s => s.id === cs.serviceId);
          return sum + (service?.price ? Number(service.price) : 0);
        }, 0);
        // Always set price when using sum, even if it's 0
        finalPrice = calculatedPrice >= 0 ? calculatedPrice : undefined;
      } else if (pricingType === "custom" && formData.comboPrice) {
        const parsedPrice = parseFloat(formData.comboPrice);
        finalPrice = isNaN(parsedPrice) ? undefined : parsedPrice;
      }
      
      // Prepare combo service IDs and time between services
      const comboServiceIds = comboServices.map(cs => cs.serviceId);
      const timeBetweenMinutes: number[] = [];
      
      // Calculate time between services in minutes (for sequence booking)
      if (bookingType === "sequence") {
        for (let i = 0; i < comboServices.length - 1; i++) {
          const cs = comboServices[i];
          if (cs.timeBetweenHours !== undefined && cs.timeBetweenMinutes !== undefined) {
            const hours = parseInt(cs.timeBetweenHours || "0");
            const minutes = parseInt(cs.timeBetweenMinutes || "0");
            timeBetweenMinutes.push(hours * 60 + minutes);
          } else {
            timeBetweenMinutes.push(0);
          }
        }
      }
      
      const serviceData = {
        name: formData.comboName,
        description: formData.description || undefined,
        durationMinutes: totalDuration || undefined,
        price: finalPrice !== undefined ? finalPrice : (pricingType === "sum" ? 0 : undefined),
        priceType: formData.comboPriceType as 'FIXED' | 'FROM' | 'RANGE',
        serviceType: 'COMBO' as const,
        color: formData.color || undefined,
        categoryId: formData.categoryId && formData.categoryId !== "none" ? parseInt(formData.categoryId) : undefined,
        comboServiceIds: comboServiceIds && comboServiceIds.length > 0 ? comboServiceIds : undefined,
        timeBetweenMinutes: timeBetweenMinutes && timeBetweenMinutes.length > 0 ? timeBetweenMinutes : undefined,
      };
      
      console.log("Saving combo service with data:", serviceData);
      
      if (isEditMode && id) {
        await updateService(parseInt(id), serviceData);
      } else {
        await createService(serviceData);
      }
      
      navigate(getPath("items-category"));
    } catch (error: any) {
      console.error("Failed to create combo service:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to create combo service");
    }
  };

  const handleSaveAndAddNext = async () => {
    try {
      // Validate required fields
      if (!formData.comboName.trim()) {
        toast.error("Please enter a combo service name");
        return;
      }
      
      if (comboServices.length === 0) {
        toast.error("Please add at least one service to the combo");
        return;
      }
      
      // Calculate total duration based on booking type
      let totalDuration: number;
      
      if (bookingType === "parallel") {
        // For parallel: duration is the maximum (longest) service duration
        totalDuration = comboServices.reduce((max, cs) => {
          const service = services.find(s => s.id === cs.serviceId);
          const serviceDuration = service?.durationMinutes || 0;
          return Math.max(max, serviceDuration);
        }, 0);
      } else {
        // For sequence: sum all service durations + time between services
        totalDuration = comboServices.reduce((sum, cs, index) => {
          const service = services.find(s => s.id === cs.serviceId);
          const serviceDuration = service?.durationMinutes || 0;
          
          // Add service duration
          let duration = sum + serviceDuration;
          
          // Add time between services (not for the last service)
          if (index < comboServices.length - 1 && cs.timeBetweenHours !== undefined && cs.timeBetweenMinutes !== undefined) {
            const timeBetweenHours = parseInt(cs.timeBetweenHours || "0");
            const timeBetweenMinutes = parseInt(cs.timeBetweenMinutes || "0");
            const timeBetweenTotal = timeBetweenHours * 60 + timeBetweenMinutes;
            duration += timeBetweenTotal;
          }
          
          return duration;
        }, 0);
      }
      
      // Calculate price based on pricing type
      let finalPrice: number | undefined;
      if (pricingType === "sum") {
        const calculatedPrice = comboServices.reduce((sum, cs) => {
          const service = services.find(s => s.id === cs.serviceId);
          return sum + (service?.price ? Number(service.price) : 0);
        }, 0);
        // Always set price when using sum, even if it's 0
        finalPrice = calculatedPrice >= 0 ? calculatedPrice : undefined;
      } else if (pricingType === "custom" && formData.comboPrice) {
        const parsedPrice = parseFloat(formData.comboPrice);
        finalPrice = isNaN(parsedPrice) ? undefined : parsedPrice;
      }
      
      // Prepare combo service IDs and time between services
      const comboServiceIds = comboServices.map(cs => cs.serviceId);
      const timeBetweenMinutes: number[] = [];
      
      // Calculate time between services in minutes (for sequence booking)
      if (bookingType === "sequence") {
        for (let i = 0; i < comboServices.length - 1; i++) {
          const cs = comboServices[i];
          if (cs.timeBetweenHours !== undefined && cs.timeBetweenMinutes !== undefined) {
            const hours = parseInt(cs.timeBetweenHours || "0");
            const minutes = parseInt(cs.timeBetweenMinutes || "0");
            timeBetweenMinutes.push(hours * 60 + minutes);
          } else {
            timeBetweenMinutes.push(0);
          }
        }
      }
      
      const serviceData = {
        name: formData.comboName,
        description: formData.description || undefined,
        durationMinutes: totalDuration || undefined,
        price: finalPrice !== undefined ? finalPrice : (pricingType === "sum" ? 0 : undefined),
        priceType: formData.comboPriceType as 'FIXED' | 'FROM' | 'RANGE',
        serviceType: 'COMBO' as const,
        color: formData.color || undefined,
        categoryId: formData.categoryId && formData.categoryId !== "none" ? parseInt(formData.categoryId) : undefined,
        comboServiceIds: comboServiceIds && comboServiceIds.length > 0 ? comboServiceIds : undefined,
        timeBetweenMinutes: timeBetweenMinutes && timeBetweenMinutes.length > 0 ? timeBetweenMinutes : undefined,
      };
      
      console.log("Saving combo service with data:", serviceData);
      
      if (isEditMode && id) {
        // In edit mode, just save and go back
        await updateService(parseInt(id), serviceData);
        navigate(getPath("items-category"));
        return;
      }
      
      await createService(serviceData);
      
      // Reset form for next combo
      setFormData({
        comboName: "",
        categoryId: "none",
        description: "",
        allowOnlineBooking: true,
        comboPriceType: "FIXED",
        comboPrice: "",
        color: "#9333ea",
      });
      setComboServices([]);
      setBookingType("sequence");
      setPricingType("custom");
    } catch (error: any) {
      console.error("Failed to create combo service:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to create combo service");
    }
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
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {isEditMode ? "Edit Combo Service" : "Add Combo Service"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <HelpCircle size={16} />
                How it works
              </Button>
              {!isEditMode && (
                <Button
                  onClick={handleSaveAndAddNext}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  SAVE & ADD NEXT COMBO
                </Button>
              )}
              <Button
                onClick={handleSave}
                size="sm"
                variant="outline"
                className={isEditMode ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-gray-100 text-gray-400"}
                disabled={!isEditMode}
              >
                {isEditMode ? "UPDATE COMBO SERVICE" : "SAVE"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSidebarItem(item.id)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors relative ${
                    activeSidebarItem === item.id
                      ? "bg-gray-50 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {activeSidebarItem === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900 rounded-r" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">
                  Combo Service Details
                </h2>

                {/* GENERAL Tab */}
                {activeSidebarItem === "general" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="combo-name">Combo name</Label>
                      <Input
                        id="combo-name"
                        placeholder="Combo name"
                        value={formData.comboName}
                        onChange={(e) =>
                          handleInputChange("comboName", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-category">Service Category</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) =>
                          handleInputChange("categoryId", value)
                        }
                      >
                        <SelectTrigger id="service-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not categorized</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Combo Service Color */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Combo Service Color</Label>
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
                        This color will be used to display appointments for this combo service in the calendar
                      </p>
                    </div>

                    {/* Text Editor Toolbar */}
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Bold size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Italic size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Strikethrough size={16} className="text-gray-600" />
                      </button>
                      <div className="w-px h-6 bg-gray-200" />
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <List size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <ListOrdered size={16} className="text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-description">
                        Service Description
                      </Label>
                      <Textarea
                        id="service-description"
                        placeholder="Enter service description..."
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        className="min-h-[120px]"
                      />
                    </div>

                    {/* Add Photos */}
                    <div className="space-y-2">
                      <Label>Add Photos</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-gray-400 transition-colors cursor-pointer">
                        <ImageIcon size={32} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Add photos</span>
                      </div>
                    </div>

                    {/* Allow clients to book online */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="allow-online-booking">
                          Allow clients to book online
                        </Label>
                        <HelpCircle size={16} className="text-gray-400" />
                      </div>
                      <Switch
                        id="allow-online-booking"
                        checked={formData.allowOnlineBooking}
                        onCheckedChange={(checked) =>
                          handleInputChange("allowOnlineBooking", checked)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* SERVICES Tab */}
                {activeSidebarItem === "services" && (
                  <div className="space-y-6">
                    {/* Booking Type */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-gray-900">
                        Booking Type
                      </h3>
                      <RadioGroup
                        value={bookingType}
                        onValueChange={setBookingType}
                      >
                        <div className="space-y-3">
                          <div
                            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer ${
                              bookingType === "sequence"
                                ? "border-gray-900"
                                : "border-gray-200"
                            }`}
                            onClick={() => setBookingType("sequence")}
                          >
                            <RadioGroupItem
                              value="sequence"
                              id="sequence"
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="sequence"
                                className="font-medium cursor-pointer"
                              >
                                Sequence
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                Services are performed one after another. You
                                have the option to add breaks/time between each
                                service.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer ${
                              bookingType === "parallel"
                                ? "border-gray-900"
                                : "border-gray-200"
                            }`}
                            onClick={() => setBookingType("parallel")}
                          >
                            <RadioGroupItem
                              value="parallel"
                              id="parallel"
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="parallel"
                                className="font-medium cursor-pointer"
                              >
                                Parallel
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                Services are performed at the same time. Each
                                service is assigned to a different Staff Member.
                              </p>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Combo Section */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-gray-900">
                        Combo
                      </h3>
                      {comboServices.length === 0 && isEditMode && (
                        <div className="text-sm text-gray-500 italic">
                          No services added to this combo yet.
                        </div>
                      )}
                      <div className="space-y-3">
                        {comboServices.map((service, index) => (
                          <div key={service.id} className="space-y-3">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                              <div 
                                className={`w-1 h-12 rounded-full ${service.color?.startsWith("bg-") ? service.color : "bg-gray-400"}`}
                                style={service.color?.startsWith("#") ? { backgroundColor: service.color } : {}}
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
                              <button
                                onClick={() => handleRemoveService(service.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X size={18} />
                              </button>
                            </div>

                            {/* Time between services (only for sequence, and not for last service) */}
                            {bookingType === "sequence" &&
                              index < comboServices.length - 1 && (
                                <div className="ml-5 pl-4 border-l-2 border-gray-200">
                                  {service.timeBetweenHours !== undefined ? (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={service.timeBetweenHours}
                                          onValueChange={(value) =>
                                            handleUpdateServiceTime(
                                              service.id,
                                              "timeBetweenHours",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-24">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(
                                              (h) => (
                                                <SelectItem key={h} value={h.toString()}>
                                                  {h}h
                                                </SelectItem>
                                              )
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Select
                                          value={service.timeBetweenMinutes}
                                          onValueChange={(value) =>
                                            handleUpdateServiceTime(
                                              service.id,
                                              "timeBetweenMinutes",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger className="w-24">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[0, 15, 30, 45].map((m) => (
                                              <SelectItem key={m} value={m.toString()}>
                                                {m}min
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <span className="text-sm text-gray-600">
                                        Time between services
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleRemoveTimeBetween(service.id)
                                        }
                                        className="ml-auto text-gray-400 hover:text-gray-600"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleAddTimeBetween(service.id)
                                      }
                                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                                    >
                                      <Plus size={16} />
                                      Add time between services
                                    </button>
                                  )}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>

                      {servicesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <Select onValueChange={(value) => handleAddService(parseInt(value))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a service to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {services
                              .filter((s) => !comboServices.some((cs) => cs.serviceId === s.id))
                              .map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}

                {/* PRICING Tab */}
                {activeSidebarItem === "pricing" && (
                  <div className="space-y-6">
                    {/* Pricing Type */}
                    <div className="space-y-4">
                      <RadioGroup
                        value={pricingType}
                        onValueChange={setPricingType}
                      >
                        <div className="space-y-3">
                          <div
                            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer ${
                              pricingType === "sum"
                                ? "border-gray-900"
                                : "border-gray-200"
                            }`}
                            onClick={() => setPricingType("sum")}
                          >
                            <RadioGroupItem
                              value="sum"
                              id="service-pricing"
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="service-pricing"
                                className="font-medium cursor-pointer"
                              >
                                Service Pricing
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                The price for the Combo Service is based on the
                                price for the individual services. If you adjust
                                the price for one of the services, the Combo
                                price will also change.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer ${
                              pricingType === "custom"
                                ? "border-gray-900"
                                : "border-gray-200"
                            }`}
                            onClick={() => setPricingType("custom")}
                          >
                            <RadioGroupItem
                              value="custom"
                              id="custom-pricing"
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="custom-pricing"
                                className="font-medium cursor-pointer"
                              >
                                Custom Pricing
                              </Label>
                              <p className="text-sm text-gray-600 mt-1">
                                Set a custom price for this Combo Service. It
                                can be higher or lower than the Service Pricing
                                would be, but it won't change if you adjust the
                                price for the individual services.
                              </p>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Combo Price (for Custom Pricing) */}
                    {pricingType === "custom" && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Label>Price type</Label>
                          <Select
                            value={formData.comboPriceType}
                            onValueChange={(value) =>
                              handleInputChange("comboPriceType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="FROM">From</SelectItem>
                              <SelectItem value="RANGE">Range</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">zł</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={formData.comboPrice}
                              onChange={(e) =>
                                handleInputChange("comboPrice", e.target.value)
                              }
                            />
                          </div>
                          {!formData.comboPrice && (
                            <p className="text-sm text-red-500">
                              This field is required
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Individual Services Pricing */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-gray-900">
                        Services in Combo
                      </h3>
                      {comboServices.map((service) => (
                        <div
                          key={service.id}
                          className="p-4 bg-gray-50 rounded-lg space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 ${service.color} rounded-full`} />
                            <h4 className="font-medium text-gray-900">
                              {service.name}
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Price type</Label>
                              <Select
                                value={service.priceType}
                                onValueChange={(value) =>
                                  handleUpdateServicePrice(
                                    service.id,
                                    "priceType",
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="FROM">From</SelectItem>
                              <SelectItem value="RANGE">Range</SelectItem>
                            </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Price</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">zł</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={service.priceValue}
                                  onChange={(e) =>
                                    handleUpdateServicePrice(
                                      service.id,
                                      "priceValue",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              {!service.priceValue && (
                                <p className="text-sm text-red-500">
                                  This field is required
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        {pricingType === "custom"
                          ? "Any changes to the price for the individual services will only apply to the Combo Service."
                          : "The combo price is calculated from individual service prices."}
                      </p>
                      <div className="text-right">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">COMBO PRICE</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {calculateComboPrice()} zł
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">COMBO DURATION</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {calculateComboDuration()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



