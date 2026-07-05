import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Edit,
  Menu,
  Calendar,
  Star,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  HelpCircle,
  Clock,
  Pencil,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  UserPlus,
  Send,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "@/utils/navigationUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, subDays, parse, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { useStaff } from "@/hooks/useStaff";
import { useServices } from "@/hooks/useServices";
import { useTimeOff } from "@/hooks/useTimeOff";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { useCommissions, useCommissionRules } from "@/hooks/useCommissions";
import { usePayments } from "@/hooks/usePayments";
import { CommissionCategory, CommissionType } from "@/services/commissionService";
import { PaymentMethod } from "@/services/paymentService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Helper function to format duration
const formatDuration = (minutes?: number): string => {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

// Helper function to format price
const formatPrice = (price?: number): string => {
  if (price === undefined || price === null) return "N/A";
  return `${price.toFixed(2)} zł`;
};

// Helper function to get initials
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Helper function to get color class
const getColorClass = (color?: string): string => {
  if (!color) return "bg-gray-400";
  if (color.startsWith("#")) return "";
  if (color.startsWith("bg-")) return color;
  return "bg-gray-400";
};

export default function StaffPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff-members");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [activeContentTab, setActiveContentTab] = useState("services");
  const [searchQuery, setSearchQuery] = useState("");
  const [servicesSearchQuery, setServicesSearchQuery] = useState("");
  const [selectedServicesForStaff, setSelectedServicesForStaff] = useState<number[]>([]);
  const [workingHoursForm, setWorkingHoursForm] = useState<Record<string, { start: string; end: string; isClosed: boolean }>>({});
  const [viewType, setViewType] = useState("Day");
  const [selectedDate, setSelectedDate] = useState(new Date()); // Today
  const [selectedStaffFilter, setSelectedStaffFilter] = useState("All");
  const [selectedStaffer, setSelectedStaffer] = useState("All");
  const [selectedCommissionCategory, setSelectedCommissionCategory] = useState("default");

  // Fetch data from API
  const businessId = useBusinessId();
  const { getPath } = useNavigation();
  const { staff: apiStaff, loading: staffLoading, updateStaff, refresh: refreshStaff } = useStaff(businessId);
  const { services: apiServices, loading: servicesLoading, updateService, refresh: refreshServices } = useServices(businessId);
  const { timeOffs, createTimeOff, loading: timeOffsLoading } = useTimeOff(businessId);
  const { businessHours, getDefaultHours, getHoursForDay } = useBusinessHours(businessId);
  
  // Commission and Payment hooks
  const selectedStaffIdForCommissions = selectedStaffer !== "All" ? parseInt(selectedStaffer) : undefined;
  const { 
    commissions, 
    pendingCommissions, 
    totalPending, 
    loading: commissionsLoading 
  } = useCommissions({ staffId: selectedStaffIdForCommissions });
  const {
    rules: commissionRules,
    loading: rulesLoading,
    error: rulesError,
    createRule: createCommissionRule,
    updateRule: updateCommissionRule,
    deleteRule: deleteCommissionRule,
    deleteAllRules: deleteAllCommissionRules,
    getRulesByCategory,
    refresh: refreshCommissionRules
  } = useCommissionRules();
  const { 
    payments, 
    loading: paymentsLoading,
    createPayment 
  } = usePayments({ staffId: selectedStaffIdForCommissions });
  
  // Get default business hours
  const defaultHours = getDefaultHours();
  const businessStartHour = defaultHours ? parseInt(defaultHours.startTime.split(':')[0]) : 10;
  const businessEndHour = defaultHours ? parseInt(defaultHours.endTime.split(':')[0]) : 19;
  
  // Edit dialogs state
  const [isEditBusinessHoursOpen, setIsEditBusinessHoursOpen] = useState(false);
  const [isAddTimeOffOpen, setIsAddTimeOffOpen] = useState(false);
  const [isCommissionRuleDialogOpen, setIsCommissionRuleDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditStaffDialogOpen, setIsEditStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editingCommissionRule, setEditingCommissionRule] = useState<any>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    phone: "",
    email: "",
    position: "",
    permissionLevel: "",
    showInCalendar: true,
    availableForOnlineBooking: true,
    serviceIds: [] as number[],
  });
  const [commissionRuleForm, setCommissionRuleForm] = useState({
    category: CommissionCategory.DEFAULT,
    type: CommissionType.PERCENTAGE,
    value: 0,
    description: "",
    staffId: undefined as number | undefined,
    serviceId: undefined as number | undefined,
    scope: "category" as "category" | "service", // New field to determine if rule is for category or specific service
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: PaymentMethod.CASH,
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: "",
    notes: "",
  });
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: "",
    startDate: format(selectedDate, "yyyy-MM-dd"),
    endDate: format(selectedDate, "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    isFullDay: true,
    isRecurring: false,
    recurrencePattern: "",
    recurrenceEndDate: "",
    reason: "",
    isApproved: false,
  });
  
  // Initialize business hours form from fetched data
  const [businessHoursForm, setBusinessHoursForm] = useState({
    startTime: defaultHours?.startTime || "10:00",
    endTime: defaultHours?.endTime || "19:00",
    isClosed: false,
  });
  
  
  // Update forms when business hours are loaded
  useEffect(() => {
    if (defaultHours) {
      setBusinessHoursForm(prev => ({
        ...prev,
        startTime: prev.startTime === "10:00" ? defaultHours.startTime : prev.startTime,
        endTime: prev.endTime === "19:00" ? defaultHours.endTime : prev.endTime,
      }));
    }
  }, [defaultHours]);

  // Set default selected staff when data loads
  useEffect(() => {
    if (apiStaff && apiStaff.length > 0 && selectedStaffId === null) {
      setSelectedStaffId(apiStaff[0].id);
    }
  }, [apiStaff, selectedStaffId]);

  const selectedStaff = apiStaff?.find((s) => s.id === selectedStaffId);

  // Initialize selected services when staff is selected
  useEffect(() => {
    if (selectedStaff && apiServices) {
      // Get services currently linked to this staff member
      const linkedServiceIds = apiServices
        .filter(service => service.staffIds?.includes(selectedStaff.id))
        .map(service => service.id);
      setSelectedServicesForStaff(linkedServiceIds);
    } else {
      setSelectedServicesForStaff([]);
    }
  }, [selectedStaff, apiServices]);

  // Initialize working hours form when staff is selected
  useEffect(() => {
    if (selectedStaff) {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const hours: Record<string, { start: string; end: string; isClosed: boolean }> = {};

      // Use working hours from backend if available, otherwise use defaults
      if (selectedStaff.workingHoursDetail) {
        days.forEach(day => {
          const dayHours = selectedStaff.workingHoursDetail?.[day];
          if (dayHours) {
            const isClosed = dayHours.isClosed === true ||
                           (dayHours.start === null && dayHours.end === null);
            hours[day] = {
              start: dayHours.start || "10:00",
              end: dayHours.end || "19:00",
              isClosed: isClosed,
            };
          } else {
            hours[day] = { start: "10:00", end: "19:00", isClosed: false };
          }
        });
      } else {
        // Default hours if no data from backend
        days.forEach(day => {
          hours[day] = { start: "10:00", end: "19:00", isClosed: false };
        });
      }

      setWorkingHoursForm(hours);
    } else {
      setWorkingHoursForm({});
    }
  }, [selectedStaff, selectedStaff?.workingHoursDetail]);
  
  // Get business hours for the selected date
  const getBusinessHoursForSelectedDate = useCallback(() => {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[selectedDate.getDay()];
    const dayHours = getHoursForDay(dayOfWeek);
    
    // If we have hours for this day
    if (dayHours) {
      // If the day is closed (not enabled)
      if (!dayHours.enabled) {
        return {
          startTime: dayHours.startTime || "00:00",
          endTime: dayHours.endTime || "23:59",
          isClosed: true
        };
      }
      
      // If the day is enabled and has times
      if (dayHours.startTime && dayHours.endTime) {
        return {
          startTime: dayHours.startTime,
          endTime: dayHours.endTime,
          isClosed: false
        };
      }
    }
    
    // Fallback to default hours
    if (defaultHours) {
      return {
        startTime: defaultHours.startTime,
        endTime: defaultHours.endTime,
        isClosed: false
      };
    }
    
    return {
      startTime: "10:00",
      endTime: "19:00",
      isClosed: false
    };
  }, [selectedDate, getHoursForDay, defaultHours]);
  
  const currentDayBusinessHours = getBusinessHoursForSelectedDate();
  const isBusinessClosed = currentDayBusinessHours.isClosed;
  
  // Get dates to display based on view type
  const getDatesToDisplay = useCallback(() => {
    if (viewType === "Day") {
      return [selectedDate];
    } else if (viewType === "Week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else if (viewType === "Month") {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
    return [selectedDate];
  }, [viewType, selectedDate]);
  
  const datesToDisplay = getDatesToDisplay();
  
  // Update date navigation handlers
  const handlePreviousDate = useCallback(() => {
    if (viewType === "Day") {
      setSelectedDate(subDays(selectedDate, 1));
    } else if (viewType === "Week") {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else if (viewType === "Month") {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  }, [viewType, selectedDate]);
  
  const handleNextDate = useCallback(() => {
    if (viewType === "Day") {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewType === "Week") {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else if (viewType === "Month") {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  }, [viewType, selectedDate]);
  
  // Get date range display text
  const getDateRangeText = useCallback(() => {
    if (viewType === "Day") {
      return format(selectedDate, "EEEE, MMMM d");
    } else if (viewType === "Week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`;
      } else {
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      }
    } else if (viewType === "Month") {
      return format(selectedDate, "MMMM yyyy");
    }
    return format(selectedDate, "EEEE, MMMM d");
  }, [viewType, selectedDate]);
  
  // Filter all services by search query (for services tab)
  const filteredAllServices = useMemo(() => {
    if (!apiServices) return [];
    if (!servicesSearchQuery.trim()) return apiServices;
    const query = servicesSearchQuery.toLowerCase();
    return apiServices.filter((service) =>
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query)
    );
  }, [apiServices, servicesSearchQuery]);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    return filteredAllServices.reduce((acc, service) => {
      const category = service.categoryName || "Not categorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, typeof apiServices>);
  }, [filteredAllServices]);

  const filteredStaff = useMemo(() => {
    if (!apiStaff) return [];
    return apiStaff.filter((staff) =>
      staff.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apiStaff, searchQuery]);

  const loading = staffLoading || servicesLoading;


  // Toggle service selection for staff
  const handleToggleService = (serviceId: number) => {
    setSelectedServicesForStaff(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  // Save service-staff relationships
  const handleSaveServices = async () => {
    if (!selectedStaff || !apiServices) return;

    try {
      // Update each service to include/exclude the selected staff member
      const updatePromises = apiServices.map(async (service) => {
        const shouldInclude = selectedServicesForStaff.includes(service.id);
        const currentStaffIds = service.staffIds || [];
        const alreadyIncluded = currentStaffIds.includes(selectedStaff.id);

        // Only update if the relationship needs to change
        if (shouldInclude !== alreadyIncluded) {
          const newStaffIds = shouldInclude
            ? [...currentStaffIds, selectedStaff.id]
            : currentStaffIds.filter(id => id !== selectedStaff.id);

          await updateService(service.id, {
            name: service.name,
            description: service.description,
            price: service.price,
            durationMinutes: service.durationMinutes,
            categoryId: service.categoryId,
            color: service.color,
            staffIds: newStaffIds,
          });
        }
      });

      await Promise.all(updatePromises);
      await refreshServices();
      toast.success("Services updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save services");
    }
  };

  // Save working hours
  const handleSaveWorkingHours = async () => {
    if (!selectedStaff) return;

    try {
      const requestData = {
        workingHours: workingHoursForm,
      };
      await updateStaff(selectedStaff.id, requestData);
      await refreshStaff();
      const currentId = selectedStaffId;
      setSelectedStaffId(null);
      setTimeout(() => {
        setSelectedStaffId(currentId);
      }, 100);
      toast.success("Working hours updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save working hours");
    }
  };

  // Quick actions for working hours
  const handleCopyToAllDays = (sourceDay: string) => {
    const sourceHours = workingHoursForm[sourceDay];
    if (!sourceHours) return;

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const updated = { ...workingHoursForm };
    days.forEach(day => {
      updated[day] = { ...sourceHours };
    });
    setWorkingHoursForm(updated);
    toast.success(`Copied ${sourceDay} hours to all days`);
  };

  const handleSetWeekdays = () => {
    const mondayHours = workingHoursForm.monday || { start: "10:00", end: "19:00", isClosed: false };
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const updated = { ...workingHoursForm };
    weekdays.forEach(day => {
      updated[day] = { ...mondayHours };
    });
    setWorkingHoursForm(updated);
    toast.success("Set same hours for all weekdays");
  };

  const handleSetWeekends = () => {
    const saturdayHours = workingHoursForm.saturday || { start: "10:00", end: "19:00", isClosed: false };
    const weekends = ["saturday", "sunday"];
    const updated = { ...workingHoursForm };
    weekends.forEach(day => {
      updated[day] = { ...saturdayHours };
    });
    setWorkingHoursForm(updated);
    toast.success("Set same hours for weekends");
  };

  // Generate time slots from 00:00 to 23:59 (24 hours, every hour)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Calculate position percentage for a given time (00:00 to 23:59)
  const getTimePosition = (hour: number, minute: number = 0) => {
    const totalMinutes = hour * 60 + minute;
    const totalRange = 24 * 60; // 00:00 to 23:59 = 24 hours
    return (totalMinutes / totalRange) * 100;
  };

  // Calculate width percentage for a time range
  const getTimeWidth = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const totalRange = 24 * 60;
    return ((endMinutes - startMinutes) / totalRange) * 100;
  };

  // Parse time string (HH:MM) to hours and minutes
  const parseTimeString = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours, minutes };
  };

  // Parse time string to total minutes for comparison
  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Check if a new time off conflicts with existing time offs
  const hasTimeOffConflict = (
    staffId: string | number,
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
    isFullDay: boolean
  ): boolean => {
    if (!timeOffs || timeOffs.length === 0) return false;
    
    const staffIdStr = staffId.toString();
    const newStartDate = parse(startDate, "yyyy-MM-dd", new Date());
    const newEndDate = parse(endDate, "yyyy-MM-dd", new Date());
    
    // For full day time offs, use business hours for conflict detection
    const newStart = parseTimeToMinutes(isFullDay 
      ? `${businessStartHour.toString().padStart(2, "0")}:00` 
      : startTime);
    const newEnd = parseTimeToMinutes(isFullDay 
      ? `${businessEndHour.toString().padStart(2, "0")}:00` 
      : endTime);
    
    return timeOffs.some((existing) => {
      // Must be same staff member
      if (existing.staffId.toString() !== staffIdStr) return false;
      
      // Check if date ranges overlap
      const existingStartDate = parse(existing.startDate, "yyyy-MM-dd", new Date());
      const existingEndDate = parse(existing.endDate, "yyyy-MM-dd", new Date());
      
      // Date ranges must overlap
      if (newEndDate < existingStartDate || newStartDate > existingEndDate) {
        return false;
      }
      
      // If dates overlap, check time overlap
      const existingStart = parseTimeToMinutes(existing.isFullDay 
        ? `${businessStartHour.toString().padStart(2, "0")}:00` 
        : (existing.startTime || "00:00"));
      const existingEnd = parseTimeToMinutes(existing.isFullDay 
        ? `${businessEndHour.toString().padStart(2, "0")}:00` 
        : (existing.endTime || "23:59"));
      
      // Check for time overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  // Get time offs for a specific staff member and date
  const getTimeOffsForStaff = (staffId: number, date: Date) => {
    if (!timeOffs || timeOffs.length === 0) {
      return [];
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const filtered = timeOffs.filter((to) => {
      if (to.staffId !== staffId) return false;
      const startDate = parse(to.startDate, "yyyy-MM-dd", new Date());
      const endDate = parse(to.endDate, "yyyy-MM-dd", new Date());
      const currentDate = parse(dateStr, "yyyy-MM-dd", new Date());
      
      // Reset time to midnight for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      
      const isInRange = currentDate >= startDate && currentDate <= endDate;
      
      return isInRange;
    });
    return filtered;
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Top Navigation Tabs */}
        <div className="border-b border-gray-200 bg-white px-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("staff-members")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "staff-members"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                STAFF MEMBERS
              </button>
              <button
                onClick={() => setActiveTab("shifts")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "shifts"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                SHIFTS
              </button>
              {/* Resources tab disabled */}
              {/* <button
                onClick={() => setActiveTab("resources")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "resources"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                RESOURCES
              </button> */}
              <button
                onClick={() => setActiveTab("commissions")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "commissions"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                COMMISSIONS
              </button>
            </div>
            {(activeTab === "shifts" || activeTab === "commissions") && (
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <HelpCircle size={16} />
                How it works
              </button>
            )}
          </div>
        </div>

        {/* Shifts View */}
        {activeTab === "shifts" && (
          <>
            {/* Print Styles */}
            <style>{`
              @media print {
                @page {
                  margin: 1cm;
                }
                body * {
                  visibility: hidden;
                }
                .print-section, .print-section * {
                  visibility: visible;
                }
                .print-section {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  display: block !important;
                }
                .no-print {
                  display: none !important;
                }
                .print-section table {
                  border-collapse: collapse;
                  width: 100%;
                  margin-top: 20px;
                }
                .print-section th, .print-section td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                .print-section th {
                  background-color: #f2f2f2;
                  font-weight: bold;
                }
                .print-section h1 {
                  margin-bottom: 10px;
                }
                .print-section h2 {
                  margin-top: 20px;
                  margin-bottom: 10px;
                }
              }
              @media screen {
                .print-section {
                  display: none;
                }
              }
            `}</style>
            
            {/* Print View - Hidden on screen, visible when printing */}
            <div className="print-section">
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">Staff Schedule</h1>
                <p className="text-lg mb-6">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                
                {/* Business Hours */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Business Hours</h2>
                  <div className="border border-gray-300 rounded p-4">
                    {isBusinessClosed ? (
                      <p className="text-red-600 font-medium">Closed</p>
                    ) : (
                      <p className="text-gray-900">
                        {currentDayBusinessHours.startTime} - {currentDayBusinessHours.endTime}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Staff Schedule Table */}
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-48">Staff Member</th>
                      <th>Working Hours</th>
                      <th>Time Off</th>
                      <th>Total Working Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiStaff?.map((staff) => {
                      const staffTimeOffs = getTimeOffsForStaff(staff.id, selectedDate);
                      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const dayOfWeek = dayNames[selectedDate.getDay()];
                      const staffWorkingHours = staff.workingHoursDetail?.[dayOfWeek];
                      const isStaffClosed = staffWorkingHours?.isClosed === true || 
                                           (staffWorkingHours?.start === null && staffWorkingHours?.end === null);
                      const staffStartTime = staffWorkingHours?.start || null;
                      const staffEndTime = staffWorkingHours?.end || null;
                      
                      // Calculate total working hours excluding time off
                      const calculateWorkingHours = () => {
                        if (isStaffClosed || !staffStartTime || !staffEndTime) {
                          return "0h";
                        }
                        
                        // Parse working hours
                        const [startHour, startMin] = staffStartTime.split(':').map(Number);
                        const [endHour, endMin] = staffEndTime.split(':').map(Number);
                        const startMinutes = startHour * 60 + startMin;
                        const endMinutes = endHour * 60 + endMin;
                        let totalMinutes = endMinutes - startMinutes;
                        
                        // Subtract time off periods
                        staffTimeOffs.forEach((timeOff) => {
                          if (timeOff.isFullDay) {
                            totalMinutes = 0;
                            return;
                          }
                          
                          const toStartTime = timeOff.startTime || "00:00";
                          const toEndTime = timeOff.endTime || "23:59";
                          const [toStartHour, toStartMin] = toStartTime.split(':').map(Number);
                          const [toEndHour, toEndMin] = toEndTime.split(':').map(Number);
                          const toStartMinutes = toStartHour * 60 + toStartMin;
                          const toEndMinutes = toEndHour * 60 + toEndMin;
                          
                          // Check if time off overlaps with working hours
                          const overlapStart = Math.max(startMinutes, toStartMinutes);
                          const overlapEnd = Math.min(endMinutes, toEndMinutes);
                          
                          if (overlapStart < overlapEnd) {
                            totalMinutes -= (overlapEnd - overlapStart);
                          }
                        });
                        
                        // Ensure non-negative
                        totalMinutes = Math.max(0, totalMinutes);
                        
                        // Format as hours and minutes
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        
                        if (hours > 0 && minutes > 0) {
                          return `${hours}h ${minutes}min`;
                        } else if (hours > 0) {
                          return `${hours}h`;
                        } else if (minutes > 0) {
                          return `${minutes}min`;
                        } else {
                          return "0h";
                        }
                      };
                      
                      return (
                        <tr key={staff.id}>
                          <td className="font-medium">{staff.name}</td>
                          <td>
                            {isStaffClosed ? (
                              <span className="text-red-600">Closed</span>
                            ) : staffStartTime && staffEndTime ? (
                              <span>{staffStartTime} - {staffEndTime}</span>
                            ) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </td>
                          <td>
                            {staffTimeOffs.length > 0 ? (
                              <div className="space-y-1">
                                {staffTimeOffs.map((timeOff) => {
                                  const startTime = timeOff.isFullDay ? "00:00" : (timeOff.startTime || "00:00");
                                  const endTime = timeOff.isFullDay ? "23:59" : (timeOff.endTime || "23:59");
                                  return (
                                    <div key={timeOff.id} className="text-sm">
                                      {timeOff.isFullDay ? 'Full Day' : `${startTime} - ${endTime}`}
                                      {timeOff.reason && <span className="text-gray-600 ml-2">({timeOff.reason})</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="font-semibold">
                            {calculateWorkingHours()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Regular View - Hidden when printing */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white no-print">
            {/* Control Panel */}
            <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">View:</Label>
                    <Select value={viewType} onValueChange={setViewType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Staff:</Label>
                    <Select
                      value={selectedStaffFilter}
                      onValueChange={setSelectedStaffFilter}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Staff</SelectItem>
                        {apiStaff?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <button
                      onClick={handlePreviousDate}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                      aria-label="Previous day"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="text-center min-w-[140px]">
                      <Input
                        type="date"
                        value={format(selectedDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const newDate = parse(e.target.value, "yyyy-MM-dd", new Date());
                          if (!isNaN(newDate.getTime())) {
                            setSelectedDate(newDate);
                          }
                        }}
                        className="h-8 text-xs text-center font-semibold border-0 bg-transparent p-0 cursor-pointer hover:bg-gray-100 rounded px-2"
                        title="Click to change date"
                      />
                      <div className="text-xs text-gray-500 mt-0.5">
                        {getDateRangeText()}
                      </div>
                    </div>
                    <button
                      onClick={handleNextDate}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                      aria-label="Next day"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setIsAddTimeOffOpen(true)}
                  >
                    <Calendar size={16} />
                    Add Time Off
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Copy the selected day's hours to all staff working hour entries for that day
                      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const dayOfWeek = dayNames[selectedDate.getDay()];
                      const sourceHours = workingHoursForm[dayOfWeek];
                      if (!sourceHours) {
                        toast.info("No hours set for the selected day");
                        return;
                      }
                      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                      const updated = { ...workingHoursForm };
                      days.forEach(day => {
                        updated[day] = { ...sourceHours };
                      });
                      setWorkingHoursForm(updated);
                      toast.success(`Copied ${dayOfWeek} schedule to all days`);
                    }}
                  >
                    <Copy size={16} />
                    Copy Schedule
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} />
                    Print
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar Grid View */}
            <div className="flex-1 overflow-auto bg-gray-50">
              <div className={`px-4 pt-8 pb-4 ${viewType === "Day" ? "min-w-[2400px]" : viewType === "Week" ? "min-w-[16800px]" : "min-w-[72000px]"}`}>
                {/* Time Header Row (X-axis: 00:00 - 23:59) */}
                <div className="sticky top-0 bg-white z-30 border-b-2 border-gray-300 pt-6">
                  <div className="flex">
                    {/* Left column for row labels */}
                    <div className="w-64 flex-shrink-0 border-r border-gray-300 bg-white"></div>
                    {/* Day columns header */}
                    <div className="flex-1 flex">
                      {datesToDisplay.map((date, dateIndex) => (
                        <div key={dateIndex} className="flex-1 border-l border-gray-300 relative">
                          {/* Day header */}
                          <div className="absolute top-0 left-0 right-0 h-6 bg-gray-50 border-b border-gray-300 flex items-center justify-center">
                            <div className="text-xs font-semibold text-gray-700">
                              {format(date, "EEE")}
                            </div>
                            <div className="text-xs text-gray-500 ml-1">
                              {format(date, "d")}
                            </div>
                          </div>
                          {/* Time slots header */}
                          <div className="relative h-10 mt-6">
                            {timeSlots.map((hour) => (
                              <div
                                key={hour}
                                className="absolute top-0 bottom-0 border-l border-gray-300"
                                style={{ left: `${(hour / 24) * 100}%` }}
                              >
                                {dateIndex === 0 && (
                                  <span className="absolute -top-6 left-0 text-xs font-semibold text-gray-700 whitespace-nowrap">
                                    {hour.toString().padStart(2, "0")}:00
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Business Hours Row (Y-axis: first row) */}
                <div className="flex border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                  <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 flex items-center gap-3 bg-blue-50">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Business Hours</div>
                      <div className="text-xs text-gray-500">Store operating hours</div>
                    </div>
                  </div>
                  <div className="flex-1 flex">
                    {datesToDisplay.map((date, dateIndex) => {
                      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                      const dayOfWeek = dayNames[date.getDay()];
                      const dayHours = getHoursForDay(dayOfWeek);
                      const isDayClosed = !dayHours?.enabled;
                      const dayStartTime = dayHours?.startTime || "10:00";
                      const dayEndTime = dayHours?.endTime || "19:00";
                      
                      return (
                        <div key={dateIndex} className="flex-1 relative h-14 bg-white border-l border-gray-200">
                          {isDayClosed ? (
                            <div
                              className="absolute top-2 bottom-2 bg-gray-600 rounded flex items-center justify-between px-4 text-white text-sm font-medium shadow-md hover:bg-gray-700 transition-colors cursor-pointer"
                              style={{
                                left: `${getTimePosition(0)}%`,
                                width: `${getTimeWidth(0, 0, 23, 59)}%`,
                              }}
                              onClick={() => {
                                setSelectedDate(date);
                                setBusinessHoursForm({ 
                                  startTime: dayStartTime, 
                                  endTime: dayEndTime, 
                                  isClosed: true 
                                });
                                setIsEditBusinessHoursOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>Closed</span>
                              </div>
                              <button 
                                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(date);
                                  setBusinessHoursForm({ startTime: "10:00", endTime: "19:00", isClosed: true });
                                  setIsEditBusinessHoursOpen(true);
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="absolute top-2 bottom-2 bg-blue-500 rounded flex items-center justify-between px-4 text-white text-sm font-medium shadow-md hover:bg-blue-600 transition-colors cursor-pointer"
                              style={{
                                left: `${getTimePosition(
                                  parseInt(dayStartTime.split(':')[0]), 
                                  parseInt(dayStartTime.split(':')[1])
                                )}%`,
                                width: `${getTimeWidth(
                                  parseInt(dayStartTime.split(':')[0]), 
                                  parseInt(dayStartTime.split(':')[1]),
                                  parseInt(dayEndTime.split(':')[0]), 
                                  parseInt(dayEndTime.split(':')[1])
                                )}%`,
                              }}
                              onClick={() => {
                                setSelectedDate(date);
                                setBusinessHoursForm({ 
                                  startTime: dayStartTime, 
                                  endTime: dayEndTime, 
                                  isClosed: false 
                                });
                                setIsEditBusinessHoursOpen(true);
                              }}
                            >
                              <span>{dayStartTime} - {dayEndTime}</span>
                              <button 
                                className="p-1.5 hover:bg-blue-600 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(date);
                                  setBusinessHoursForm({ startTime: "10:00", endTime: "19:00", isClosed: false });
                                  setIsEditBusinessHoursOpen(true);
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Rows (Y-axis: each staff member) */}
                {apiStaff?.map((staff) => {
                  return (
                    <div key={staff.id} className="flex border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 flex items-center gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                            {staff.initials || getInitials(staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {staff.name}
                          </div>
                          <div className="text-xs text-gray-500">Staff member</div>
                        </div>
                      </div>
                      <div className="flex-1 flex">
                        {datesToDisplay.map((date, dateIndex) => {
                          const staffTimeOffs = getTimeOffsForStaff(staff.id, date);
                          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                          const dayOfWeek = dayNames[date.getDay()];
                          const staffWorkingHours = staff.workingHoursDetail?.[dayOfWeek];
                          const isStaffClosed = staffWorkingHours?.isClosed === true || 
                                               (staffWorkingHours?.start === null && staffWorkingHours?.end === null);
                          const staffStartTime = staffWorkingHours?.start || null;
                          const staffEndTime = staffWorkingHours?.end || null;
                          
                          return (
                            <div key={dateIndex} className="flex-1 relative bg-white border-l border-gray-200" style={{ minHeight: staffTimeOffs.length > 0 ? '113px' : '56px' }}>
                              {/* Staff Working Hours Block - shows staff's working hours for this day */}
                              <div className="relative h-14">
                                {isStaffClosed ? (
                                  <div
                                    className="absolute top-1 bottom-1 bg-gray-600 rounded flex items-center justify-between px-4 text-white text-sm font-medium shadow-md hover:bg-gray-700 transition-colors cursor-pointer"
                                    style={{
                                      left: `${getTimePosition(0, 0)}%`,
                                      width: `${getTimeWidth(0, 0, 23, 59)}%`,
                                    }}
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setSelectedStaffId(staff.id);
                                      setActiveContentTab("working-hours");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <AlertCircle size={14} />
                                      <span>Closed</span>
                                    </div>
                                    <button 
                                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate(date);
                                        setSelectedStaffId(staff.id);
                                        setActiveContentTab("working-hours");
                                      }}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                ) : staffStartTime && staffEndTime ? (
                                  <div
                                    className="absolute top-1 bottom-1 bg-green-500 rounded flex items-center justify-between px-4 text-white text-sm font-medium shadow-md hover:bg-green-600 transition-colors cursor-pointer"
                                    style={{
                                      left: `${getTimePosition(
                                        parseInt(staffStartTime.split(':')[0]),
                                        parseInt(staffStartTime.split(':')[1])
                                      )}%`,
                                      width: `${getTimeWidth(
                                        parseInt(staffStartTime.split(':')[0]),
                                        parseInt(staffStartTime.split(':')[1]),
                                        parseInt(staffEndTime.split(':')[0]),
                                        parseInt(staffEndTime.split(':')[1])
                                      )}%`,
                                    }}
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setSelectedStaffId(staff.id);
                                      setActiveContentTab("working-hours");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock size={14} />
                                      <span>{staffStartTime} - {staffEndTime}</span>
                                    </div>
                                    <button 
                                      className="p-1.5 hover:bg-green-600 rounded transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate(date);
                                        setSelectedStaffId(staff.id);
                                        setActiveContentTab("working-hours");
                                      }}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className="absolute top-1 bottom-1 left-0 right-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded hover:border-gray-400 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setSelectedStaffId(staff.id);
                                      setActiveContentTab("working-hours");
                                    }}
                                  >
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                      <Plus size={14} />
                                      <span>Set Working Hours</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Time Off Blocks - render below working hours */}
                              {staffTimeOffs.length > 0 && (
                                <div className="relative h-14" style={{ marginTop: '0px' }}>
                                  {staffTimeOffs.map((timeOff) => {
                                    const startTime = timeOff.isFullDay ? "00:00" : (timeOff.startTime || "00:00");
                                    const endTime = timeOff.isFullDay ? "23:59" : (timeOff.endTime || "23:59");
                                    const start = parseTimeString(startTime);
                                    const end = parseTimeString(endTime);
                                    
                                    return (
                                      <div
                                        key={timeOff.id}
                                        className="absolute top-1 bottom-1 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-between px-3 text-gray-700 text-xs font-medium"
                                        style={{
                                          left: `${getTimePosition(start.hours, start.minutes)}%`,
                                          width: `${getTimeWidth(start.hours, start.minutes, end.hours, end.minutes)}%`,
                                          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 16px)",
                                          minWidth: '120px'
                                        }}
                                        title={`Time Off: ${startTime} - ${endTime}${timeOff.reason ? ` (${timeOff.reason})` : ''}`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <Calendar size={12} className="text-gray-500 flex-shrink-0" />
                                          <span className="truncate">
                                            {timeOff.isFullDay ? 'Full Day' : `${startTime} - ${endTime}`}
                                          </span>
                                        </div>
                                        {timeOff.reason && (
                                          <span className="text-gray-600 truncate ml-2 max-w-[100px]" title={timeOff.reason}>
                                            {timeOff.reason}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {apiStaff?.length === 0 && (
                  <div className="flex border-b border-gray-200 bg-white">
                    <div className="w-64 flex-shrink-0 border-r border-gray-200 p-4"></div>
                    <div className="flex-1 p-12 text-center text-gray-500">
                      <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-sm font-medium">No staff members found</p>
                      <p className="text-xs text-gray-400 mt-1">Add staff members to see their shifts</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
          </>
        )}

        {/* Edit Business Hours Dialog */}
        <Dialog open={isEditBusinessHoursOpen} onOpenChange={setIsEditBusinessHoursOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Business Hours</DialogTitle>
              <DialogDescription>
                Update the business operating hours for {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="closed"
                  checked={businessHoursForm.isClosed}
                  onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, isClosed: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="closed" className="text-sm font-medium cursor-pointer">
                  Closed
                </Label>
              </div>
              
              {!businessHoursForm.isClosed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Time</Label>
                    <Input
                      type="time"
                      value={businessHoursForm.startTime}
                      onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Time</Label>
                    <Input
                      type="time"
                      value={businessHoursForm.endTime}
                      onChange={(e) => setBusinessHoursForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditBusinessHoursOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gray-900 hover:bg-gray-800"
                onClick={async () => {
                  const dayOfWeek = format(selectedDate, "EEEE").toUpperCase();
                  try {
                    // Merge the edited day into the full schedule and save all days
                    const { businessHoursService } = await import('@/services/businessHoursService');
                    const existing = businessHours.filter(h => h.dayOfWeek !== dayOfWeek);
                    const updated = [
                      ...existing.map(h => ({
                        dayOfWeek: h.dayOfWeek,
                        enabled: h.enabled,
                        startTime: h.startTime ?? "09:00",
                        endTime: h.endTime ?? "18:00",
                      })),
                      {
                        dayOfWeek,
                        enabled: !businessHoursForm.isClosed,
                        startTime: businessHoursForm.startTime,
                        endTime: businessHoursForm.endTime,
                      },
                    ];
                    const currentBizId = typeof businessId === 'number' ? businessId : parseInt(String(businessId) || '0');
                    await businessHoursService.updateBusinessHours(currentBizId, updated);
                    toast.success(`${format(selectedDate, "EEEE")} hours updated`);
                  } catch {
                    toast.error("Failed to save business hours");
                  }
                  setIsEditBusinessHoursOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Commissions View */}
        {activeTab === "commissions" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 space-y-4">
                {/* Select Staffer */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Select staffer
                  </Label>
                  <Select
                    value={selectedStaffer}
                    onValueChange={setSelectedStaffer}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All staffers</SelectItem>
                      {apiStaff?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id.toString()}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Commission Categories */}
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCommissionCategory("default")}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "default"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Default Commissions
                  </button>

                  <button
                    onClick={() => setSelectedCommissionCategory("services")}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "services"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Services
                  </button>

                  {/* Services Sub-categories */}
                  {selectedCommissionCategory === "services" && (
                    <div className="ml-4 space-y-1">
                      <button
                        onClick={() =>
                          setSelectedCommissionCategory("services-not-categorized")
                        }
                        className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors ${
                          selectedCommissionCategory === "services-not-categorized"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Not categorized
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedCommissionCategory("products")}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "products"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Products
                  </button>

                  <button
                    onClick={() => setSelectedCommissionCategory("gift-cards")}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "gift-cards"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Gift Cards
                  </button>

                  <button
                    onClick={() =>
                      setSelectedCommissionCategory("memberships")
                    }
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "memberships"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Memberships
                  </button>

                  <button
                    onClick={() => setSelectedCommissionCategory("packages")}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      selectedCommissionCategory === "packages"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Packages
                  </button>
                </div>
              </div>

              {/* Clear all commissions button */}
              <div className="p-4 mt-auto border-t border-gray-200">
                <Button
                  variant="outline"
                  className="w-full border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete all commission rules? This action cannot be undone.")) {
                      try {
                        await deleteAllCommissionRules();
                        toast.success("All commission rules deleted successfully");
                      } catch (error) {
                        toast.error("Failed to delete commission rules");
                      }
                    }
                  }}
                >
                  Clear all commissions
                </Button>
              </div>
            </div>

            {/* Right Panel - Commission Details */}
            <div className="flex-1 overflow-y-auto bg-white p-6">
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCommissionCategory === "default" ? "Default Commissions" : 
                     selectedCommissionCategory.charAt(0).toUpperCase() + selectedCommissionCategory.slice(1) + " Commissions"}
                    {selectedStaffer !== "All" && (
                      <span className="text-lg font-normal text-gray-600 ml-2">
                        - {apiStaff?.find(s => s.id.toString() === selectedStaffer)?.name}
                      </span>
                    )}
                  </h2>
                </div>

                {/* Pending Commissions Summary */}
                {selectedStaffer !== "All" && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Pending Commissions</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {pendingCommissions.length} commission{pendingCommissions.length !== 1 ? 's' : ''} • 
                          Total: ${totalPending.toFixed(2)}
                        </p>
                      </div>
                      {pendingCommissions.length > 0 && (
                        <Button
                          onClick={() => setIsPaymentDialogOpen(true)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Create Payment
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Commission Settings List */}
                {rulesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : rulesError ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <p className="text-sm font-medium text-red-600">Commission settings unavailable</p>
                    <p className="text-xs text-gray-400">The commission service is not reachable right now.</p>
                    <button
                      onClick={refreshCommissionRules}
                      className="mt-2 text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                    {[
                      { name: "Services", category: CommissionCategory.SERVICES },
                      { name: "Products", category: CommissionCategory.PRODUCTS },
                      { name: "Gift Cards", category: CommissionCategory.GIFT_CARDS },
                      { name: "Memberships", category: CommissionCategory.MEMBERSHIPS },
                      { name: "Packages", category: CommissionCategory.PACKAGES },
                    ].map((item, index) => {
                      const categoryRules = commissionRules.filter(r => r.category === item.category);
                      const defaultRule = categoryRules.find(r => !r.staffId && !r.serviceId);
                      
                      // If a staff is selected from dropdown, find that staff's rule, otherwise use default
                      const ruleToShow = selectedStaffIdForCommissions 
                        ? categoryRules.find(r => r.staffId === selectedStaffIdForCommissions && !r.serviceId) || defaultRule
                        : defaultRule;
                      
                      const staffSpecificRules = categoryRules.filter(r => r.staffId && !r.serviceId);
                      
                      // Display value based on selected staff or default
                      const displayValue = ruleToShow 
                        ? ruleToShow.type === CommissionType.PERCENTAGE 
                          ? `${ruleToShow.value}%` 
                          : `$${ruleToShow.value.toFixed(2)}`
                        : "Not set";
                      
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {item.name}
                                </h3>
                                {ruleToShow && !ruleToShow.staffId && (
                                  <Badge variant="outline" className="text-xs">Default</Badge>
                                )}
                                {ruleToShow && ruleToShow.staffId && (
                                  <Badge variant="secondary" className="text-xs">
                                    {apiStaff?.find(s => s.id === ruleToShow.staffId)?.name || 'Staff-specific'}
                                  </Badge>
                                )}
                                {!ruleToShow && staffSpecificRules.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {staffSpecificRules.length} staff-specific
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {ruleToShow 
                                  ? selectedStaffIdForCommissions && ruleToShow.staffId === selectedStaffIdForCommissions
                                    ? `Staff-specific: ${displayValue}`
                                    : `Default: ${displayValue}`
                                  : "Not set"}
                                {!selectedStaffIdForCommissions && staffSpecificRules.length > 0 && (
                                  <span className="ml-2">
                                    • {staffSpecificRules.length} staff-specific rule{staffSpecificRules.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                // If staff is selected from dropdown, use that staff's rule or create new for that staff
                                // Otherwise, use the default rule
                                const ruleToEdit = selectedStaffIdForCommissions 
                                  ? categoryRules.find(r => r.staffId === selectedStaffIdForCommissions && !r.serviceId)
                                  : defaultRule;
                                
                                setEditingCommissionRule(ruleToEdit || null);
                                setCommissionRuleForm({
                                  category: item.category,
                                  type: ruleToEdit?.type || CommissionType.PERCENTAGE,
                                  value: ruleToEdit?.value || 0,
                                  description: ruleToEdit?.description || "",
                                  // Use selected staff from dropdown if available, otherwise use rule's staffId or undefined
                                  staffId: selectedStaffIdForCommissions || ruleToEdit?.staffId || undefined,
                                  serviceId: ruleToEdit?.serviceId || undefined,
                                  scope: ruleToEdit?.serviceId ? "service" : "category",
                                });
                                setIsCommissionRuleDialogOpen(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {displayValue}
                              </span>
                              <ChevronRight size={16} className="text-gray-400" />
                            </button>
                          </div>
                          {index < 4 && (
                            <div className="h-px bg-gray-200 mx-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending Commissions List */}
                {selectedStaffer !== "All" && pendingCommissions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Commissions</h3>
                    <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden">
                      {pendingCommissions.map((commission) => (
                        <div key={commission.id} className="p-4 bg-white border-b border-gray-200 last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {commission.category.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-600">
                                Sale: ${commission.saleAmount.toFixed(2)} • 
                                Date: {new Date(commission.commissionDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                ${commission.commissionAmount.toFixed(2)}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {commission.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Staff Members View */}
        {activeTab === "staff-members" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  type="text"
                  placeholder="Search Staff Members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
        </div>

            {/* Staff List */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                  No staff members found
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors mb-1 ${
                      selectedStaffId === staff.id
                        ? "bg-white shadow-sm"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedStaffId(staff.id)}
                      className="flex-1 flex items-center gap-3"
                    >
                      <Menu size={16} className="text-gray-400" />
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                          {staff.initials || getInitials(staff.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {staff.name}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStaff(staff);
                        setEditStaffForm({
                          name: staff.name || "",
                          phone: staff.phone || "",
                          email: staff.email || "",
                          position: staff.position || "",
                          permissionLevel: "", // Would need to get from staff data
                          showInCalendar: staff.canBookAppointments ?? true,
                          availableForOnlineBooking: staff.canBookAppointments ?? true,
                          serviceIds: staff.serviceIds || [],
                        });
                        setIsEditStaffDialogOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Edit staff member"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Floating Action Button */}
            <div className="p-4">
              <button
                aria-label="Add staff"
                onClick={() => navigate(getPath("add-staff"))}
                className="w-12 h-12 bg-black text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
              >
                <Plus size={24} />
              </button>
                  </div>
                </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : selectedStaff ? (
              <div className="p-6">
                {/* Staff Profile Header */}
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-2xl font-medium">
                      {selectedStaff.initials || getInitials(selectedStaff.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedStaff.name}
                    </h1>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-700 border-gray-300"
                      >
                        <Star size={12} className="mr-1" />
                        {selectedStaff.position || "Staff"}
                      </Badge>
                      {selectedStaff.email && (
                        <span className="text-sm text-gray-600">
                          {selectedStaff.email}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2 mt-2"
                    >
                      <Calendar size={16} />
                      SHOW CALENDAR
                      <Badge
                        variant="secondary"
                        className="ml-1 bg-gray-900 text-white"
                      >
                        5
                      </Badge>
                    </Button>
                  </div>
                </div>

                {/* Content Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveContentTab("services")}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeContentTab === "services"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      SERVICES ({selectedServicesForStaff.length})
                    </button>
                    <button
                      onClick={() => setActiveContentTab("working-hours")}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeContentTab === "working-hours"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      WORKING HOURS
                    </button>
                  </div>
                </div>

                {/* Services Tab Content */}
                {activeContentTab === "services" && (
                  <div className="space-y-6">
                    {/* Search Services */}
                    <div className="relative max-w-md">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <Input
                        type="text"
                        placeholder="Search services..."
                        className="pl-10"
                        value={servicesSearchQuery}
                        onChange={(e) => setServicesSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Services by Category */}
                    {Object.keys(servicesByCategory).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">
                          {selectedStaff 
                            ? servicesSearchQuery 
                              ? "No services found matching your search"
                              : "No services assigned to this staff member"
                            : "Select a staff member to view their services"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(servicesByCategory).map(
                          ([category, services]) => (
                            <div key={category} className="space-y-3">
                              <h3 className="text-sm font-semibold text-gray-700 uppercase">
                                {category}
                              </h3>
                              <div className="space-y-2">
                                {services.map((service) => {
                                const colorClass = getColorClass(service.color);
                                const colorStyle = service.color?.startsWith("#") ? { backgroundColor: service.color } : {};
                                const isSelected = selectedServicesForStaff.includes(service.id);
                                
                                return (
                                  <div
                                    key={service.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleService(service.id)}
                                      className="mr-2"
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
                                        <span>{formatDuration(service.durationMinutes)}</span>
                                        <span className="font-semibold text-gray-900">
                                          {formatPrice(service.price)}
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

                    {/* Save Services Button */}
                    {selectedStaff && (
                      <div className="pt-4">
                        <Button 
                          className="w-full"
                          onClick={handleSaveServices}
                          disabled={servicesLoading}
                        >
                          SAVE CHANGES
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Working Hours Tab Content */}
                {activeContentTab === "working-hours" && (
                  <div className="space-y-6">
                    {!selectedStaff ? (
                      <div className="text-center py-12 text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-sm font-medium">Select a staff member to manage their working hours</p>
                      </div>
                    ) : (
                      <>
                        {/* Quick Actions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Clock size={16} className="text-blue-600" />
                              Quick Actions
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSetWeekdays}
                              className="text-xs"
                            >
                              <Copy size={14} className="mr-1" />
                              Copy Monday to Weekdays
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSetWeekends}
                              className="text-xs"
                            >
                              <Copy size={14} className="mr-1" />
                              Copy Saturday to Weekends
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyToAllDays("monday")}
                              className="text-xs"
                            >
                              <Copy size={14} className="mr-1" />
                              Copy Monday to All Days
                            </Button>
                          </div>
                        </div>

                        {/* Weekdays Section */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Weekdays
                          </h3>
                          <div className="space-y-2">
                            {[
                              { key: "monday", label: "Monday", short: "Mon" },
                              { key: "tuesday", label: "Tuesday", short: "Tue" },
                              { key: "wednesday", label: "Wednesday", short: "Wed" },
                              { key: "thursday", label: "Thursday", short: "Thu" },
                              { key: "friday", label: "Friday", short: "Fri" },
                            ].map((day) => {
                              const dayHours = workingHoursForm[day.key] || { start: "10:00", end: "19:00", isClosed: false };
                              
                              return (
                                <div
                                  key={day.key}
                                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                                >
                                  <div className="w-20 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {dayHours.isClosed ? (
                                        <XCircle size={16} className="text-red-500" />
                                      ) : (
                                        <CheckCircle2 size={16} className="text-green-500" />
                                      )}
                                      <Label className="text-sm font-medium text-gray-900">
                                        {day.short}
                                      </Label>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Checkbox
                                      id={`${day.key}-closed`}
                                      checked={dayHours.isClosed}
                                      onCheckedChange={(checked) => {
                                        setWorkingHoursForm(prev => ({
                                          ...prev,
                                          [day.key]: {
                                            ...prev[day.key],
                                            isClosed: checked === true,
                                          },
                                        }));
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${day.key}-closed`}
                                      className="text-xs text-gray-600 cursor-pointer"
                                    >
                                      Closed
                                    </Label>
                                  </div>
                                  {!dayHours.isClosed && (
                                    <div className="flex-1 flex items-center gap-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Clock size={14} className="text-gray-400" />
                                        <Input
                                          type="time"
                                          value={dayHours.start}
                                          onChange={(e) => {
                                            setWorkingHoursForm(prev => ({
                                              ...prev,
                                              [day.key]: {
                                                ...prev[day.key],
                                                start: e.target.value,
                                              },
                                            }));
                                          }}
                                          className="h-8 text-sm"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <Input
                                          type="time"
                                          value={dayHours.end}
                                          onChange={(e) => {
                                            setWorkingHoursForm(prev => ({
                                              ...prev,
                                              [day.key]: {
                                                ...prev[day.key],
                                                end: e.target.value,
                                              },
                                            }));
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyToAllDays(day.key)}
                                        className="h-8 px-2 text-xs"
                                        title={`Copy ${day.label} hours to all days`}
                                      >
                                        <Copy size={12} />
                                      </Button>
                                    </div>
                                  )}
                                  {dayHours.isClosed && (
                                    <div className="flex-1 flex items-center justify-between">
                                      <span className="text-sm text-gray-500 italic">
                                        Closed all day
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyToAllDays(day.key)}
                                        className="h-8 px-2 text-xs"
                                        title={`Copy ${day.label} hours to all days`}
                                      >
                                        <Copy size={12} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Weekends Section */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Weekends
                          </h3>
                          <div className="space-y-2">
                            {[
                              { key: "saturday", label: "Saturday", short: "Sat" },
                              { key: "sunday", label: "Sunday", short: "Sun" },
                            ].map((day) => {
                              const dayHours = workingHoursForm[day.key] || { start: "10:00", end: "19:00", isClosed: false };
                              
                              return (
                                <div
                                  key={day.key}
                                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                                >
                                  <div className="w-20 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      {dayHours.isClosed ? (
                                        <XCircle size={16} className="text-red-500" />
                                      ) : (
                                        <CheckCircle2 size={16} className="text-green-500" />
                                      )}
                                      <Label className="text-sm font-medium text-gray-900">
                                        {day.short}
                                      </Label>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <Checkbox
                                      id={`${day.key}-closed`}
                                      checked={dayHours.isClosed}
                                      onCheckedChange={(checked) => {
                                        setWorkingHoursForm(prev => ({
                                          ...prev,
                                          [day.key]: {
                                            ...prev[day.key],
                                            isClosed: checked === true,
                                          },
                                        }));
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${day.key}-closed`}
                                      className="text-xs text-gray-600 cursor-pointer"
                                    >
                                      Closed
                                    </Label>
                                  </div>
                                  {!dayHours.isClosed && (
                                    <div className="flex-1 flex items-center gap-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Clock size={14} className="text-gray-400" />
                                        <Input
                                          type="time"
                                          value={dayHours.start}
                                          onChange={(e) => {
                                            setWorkingHoursForm(prev => ({
                                              ...prev,
                                              [day.key]: {
                                                ...prev[day.key],
                                                start: e.target.value,
                                              },
                                            }));
                                          }}
                                          className="h-8 text-sm"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <Input
                                          type="time"
                                          value={dayHours.end}
                                          onChange={(e) => {
                                            setWorkingHoursForm(prev => ({
                                              ...prev,
                                              [day.key]: {
                                                ...prev[day.key],
                                                end: e.target.value,
                                              },
                                            }));
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyToAllDays(day.key)}
                                        className="h-8 px-2 text-xs"
                                        title={`Copy ${day.label} hours to all days`}
                                      >
                                        <Copy size={12} />
                                      </Button>
                                    </div>
                                  )}
                                  {dayHours.isClosed && (
                                    <div className="flex-1 flex items-center justify-between">
                                      <span className="text-sm text-gray-500 italic">
                                        Closed all day
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyToAllDays(day.key)}
                                        className="h-8 px-2 text-xs"
                                        title={`Copy ${day.label} hours to all days`}
                                      >
                                        <Copy size={12} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 border-t border-gray-200">
                          <Button
                            className="w-full bg-gray-900 hover:bg-gray-800"
                            onClick={handleSaveWorkingHours}
                            disabled={staffLoading}
                            size="lg"
                          >
                            <Clock size={16} className="mr-2" />
                            SAVE WORKING HOURS
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a staff member to view details</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Add Time Off Sheet */}
      <Sheet open={isAddTimeOffOpen} onOpenChange={(open) => {
        setIsAddTimeOffOpen(open);
        if (!open) {
          // Reset form when closed
          setTimeOffForm({
            staffId: "",
            startDate: format(selectedDate, "yyyy-MM-dd"),
            endDate: format(selectedDate, "yyyy-MM-dd"),
            startTime: "",
            endTime: "",
            isFullDay: true,
            isRecurring: false,
            recurrencePattern: "",
            recurrenceEndDate: "",
            reason: "",
            isApproved: false,
          });
        }
      }}>
        <SheetContent side="right" className="w-full sm:w-[500px] !max-w-none p-0 flex flex-col h-screen max-h-screen">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
            <SheetTitle className="text-base font-semibold text-gray-900">Add Time Off</SheetTitle>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
            {/* Staff Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Select Staff *</Label>
              <Select
                value={timeOffForm.staffId}
                onValueChange={(value) => setTimeOffForm(prev => ({ ...prev, staffId: value }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {apiStaff?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Day / Hours Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Duration</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="full-day"
                    checked={timeOffForm.isFullDay}
                    onCheckedChange={(checked) => {
                      setTimeOffForm(prev => ({ ...prev, isFullDay: checked === true }));
                      if (checked) {
                        setTimeOffForm(prev => ({ ...prev, startTime: "", endTime: "" }));
                      }
                    }}
                  />
                  <Label htmlFor="full-day" className="text-sm font-normal cursor-pointer">
                    Full Day
                  </Label>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">Start Date *</Label>
                <Input
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">End Date *</Label>
                <Input
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) => setTimeOffForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="h-9 text-sm"
                  min={timeOffForm.startDate}
                />
              </div>
            </div>

            {/* Time Range (if not full day) */}
            {!timeOffForm.isFullDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-700">Start Time</Label>
                  <Input
                    type="time"
                    value={timeOffForm.startTime}
                    onChange={(e) => setTimeOffForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-700">End Time</Label>
                  <Input
                    type="time"
                    value={timeOffForm.endTime}
                    onChange={(e) => setTimeOffForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Recurring */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={timeOffForm.isRecurring}
                  onCheckedChange={(checked) => setTimeOffForm(prev => ({ ...prev, isRecurring: checked === true }))}
                />
                <Label htmlFor="recurring" className="text-sm font-normal cursor-pointer">
                  Repeat
                </Label>
              </div>
              {timeOffForm.isRecurring && (
                <div className="space-y-2 pl-6">
                  <Select
                    value={timeOffForm.recurrencePattern}
                    onValueChange={(value) => setTimeOffForm(prev => ({ ...prev, recurrencePattern: value }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Repeat Until</Label>
                    <Input
                      type="date"
                      value={timeOffForm.recurrenceEndDate}
                      onChange={(e) => setTimeOffForm(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                      className="h-9 text-sm"
                      min={timeOffForm.endDate}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Reason *</Label>
              <Textarea
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for time off..."
                className="text-sm min-h-[80px]"
              />
            </div>

            {/* Approval */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approved"
                  checked={timeOffForm.isApproved}
                  onCheckedChange={(checked) => setTimeOffForm(prev => ({ ...prev, isApproved: checked === true }))}
                />
                <Label htmlFor="approved" className="text-sm font-normal cursor-pointer">
                  Approved
                </Label>
                <HelpCircle className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {timeOffForm.isApproved 
                    ? "(No manager approval needed)" 
                    : "(Requires manager approval)"}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="flex-1 h-9 text-sm"
              onClick={() => setIsAddTimeOffOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1 h-9 text-sm bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate || !timeOffForm.reason}
              onClick={async () => {
                if (!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate || !timeOffForm.reason) {
                  toast.error("Please fill in all required fields");
                  return;
                }

                // Check for conflicts with other time offs (NOT ALLOWED)
                const startTime = timeOffForm.isFullDay 
                  ? `${businessStartHour.toString().padStart(2, "0")}:00` 
                  : (timeOffForm.startTime || "00:00");
                const endTime = timeOffForm.isFullDay 
                  ? `${businessEndHour.toString().padStart(2, "0")}:00` 
                  : (timeOffForm.endTime || "23:59");
                
                const hasConflict = hasTimeOffConflict(
                  timeOffForm.staffId,
                  timeOffForm.startDate,
                  timeOffForm.endDate,
                  startTime,
                  endTime,
                  timeOffForm.isFullDay,
                  businessStartHour,
                  businessEndHour
                );
                
                if (hasConflict) {
                  toast.error("This time off conflicts with an existing time off for this staff member. Please choose a different time.");
                  return;
                }

                try {
                  await createTimeOff({
                    businessId: businessId,
                    staffId: parseInt(timeOffForm.staffId),
                    startDate: timeOffForm.startDate,
                    endDate: timeOffForm.endDate,
                    startTime: timeOffForm.isFullDay ? null : timeOffForm.startTime || null,
                    endTime: timeOffForm.isFullDay ? null : timeOffForm.endTime || null,
                    isFullDay: timeOffForm.isFullDay,
                    isRecurring: timeOffForm.isRecurring,
                    recurrencePattern: timeOffForm.isRecurring ? timeOffForm.recurrencePattern : null,
                    recurrenceEndDate: timeOffForm.isRecurring ? timeOffForm.recurrenceEndDate : null,
                    reason: timeOffForm.reason,
                    isApproved: timeOffForm.isApproved,
                    needsManagerApproval: !timeOffForm.isApproved,
                  });
                  
                  toast.success("Time off created successfully");
                  setIsAddTimeOffOpen(false);
                  setTimeOffForm({
                    staffId: "",
                    startDate: format(selectedDate, "yyyy-MM-dd"),
                    endDate: format(selectedDate, "yyyy-MM-dd"),
                    startTime: "",
                    endTime: "",
                    isFullDay: true,
                    isRecurring: false,
                    recurrencePattern: "",
                    recurrenceEndDate: "",
                    reason: "",
                    isApproved: false,
                  });
                } catch (error: any) {
                  toast.error(error?.message || "Failed to create time off");
                }
              }}
            >
              SAVE
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Commission Rule Dialog */}
      <Dialog open={isCommissionRuleDialogOpen} onOpenChange={(open) => {
        setIsCommissionRuleDialogOpen(open);
        if (!open) {
          // Reset form when dialog closes
          setEditingCommissionRule(null);
          setCommissionRuleForm({
            category: CommissionCategory.DEFAULT,
            type: CommissionType.PERCENTAGE,
            value: 0,
            description: "",
            staffId: selectedStaffIdForCommissions, // Preserve the selected staff from dropdown
            serviceId: undefined,
            scope: "category",
          });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCommissionRule ? "Edit" : "Create"} Commission Rule</DialogTitle>
            <DialogDescription>
              {editingCommissionRule 
                ? "Update the commission rule settings"
                : "Create a new commission rule for this category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Scope selection - Category or Service */}
            {commissionRuleForm.category === CommissionCategory.SERVICES && (
              <div className="space-y-2">
                <Label>Rule Scope</Label>
                <Select
                  value={commissionRuleForm.scope}
                  onValueChange={(value) => setCommissionRuleForm(prev => ({ 
                    ...prev, 
                    scope: value as "category" | "service",
                    serviceId: value === "category" ? undefined : prev.serviceId,
                    // Preserve other values
                    value: prev.value,
                    type: prev.type,
                    description: prev.description,
                    staffId: prev.staffId,
                    category: prev.category,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">All Services in Category</SelectItem>
                    <SelectItem value="service">Specific Service</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {commissionRuleForm.scope === "category" 
                    ? "This rule will apply to all services in this category"
                    : "This rule will apply to a specific service only"}
                </p>
              </div>
            )}

            {/* Service selection - only if scope is "service" */}
            {commissionRuleForm.scope === "service" && commissionRuleForm.category === CommissionCategory.SERVICES && (
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={commissionRuleForm.serviceId ? commissionRuleForm.serviceId.toString() : ""}
                  onValueChange={(value) => setCommissionRuleForm(prev => ({ 
                    ...prev, 
                    serviceId: value ? parseInt(value) : undefined,
                    // Preserve other values
                    value: prev.value,
                    type: prev.type,
                    description: prev.description,
                    staffId: prev.staffId,
                    category: prev.category,
                    scope: prev.scope,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiServices?.filter(s => s.isActive).map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Staff selection */}
            <div className="space-y-2">
              <Label>Apply To Staff</Label>
              <Select
                value={commissionRuleForm.staffId ? commissionRuleForm.staffId.toString() : "all"}
                onValueChange={(value) => {
                  const newStaffId = value === "all" ? undefined : parseInt(value);
                  setCommissionRuleForm(prev => ({ 
                    ...prev, 
                    staffId: newStaffId,
                    // Preserve all other values
                    value: prev.value,
                    type: prev.type,
                    description: prev.description,
                    category: prev.category,
                    serviceId: prev.serviceId,
                    scope: prev.scope,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff (Default)</SelectItem>
                  {apiStaff?.filter(s => s.isActive).map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {commissionRuleForm.staffId 
                  ? "This rule will only apply to the selected staff member"
                  : "This rule will apply to all staff members by default"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Commission Type</Label>
              <Select
                value={commissionRuleForm.type}
                onValueChange={(value) => setCommissionRuleForm(prev => ({ 
                  ...prev, 
                  type: value as CommissionType,
                  // Preserve other values
                  value: prev.value,
                  description: prev.description,
                  staffId: prev.staffId,
                  serviceId: prev.serviceId,
                  category: prev.category,
                  scope: prev.scope,
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CommissionType.PERCENTAGE}>Percentage</SelectItem>
                  <SelectItem value={CommissionType.FIXED_AMOUNT}>Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {commissionRuleForm.type === CommissionType.PERCENTAGE ? "Percentage (%)" : "Fixed Amount ($)"}
              </Label>
              <Input
                type="number"
                step={commissionRuleForm.type === CommissionType.PERCENTAGE ? "0.1" : "0.01"}
                min="0"
                value={commissionRuleForm.value || ""}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value);
                  setCommissionRuleForm(prev => ({ ...prev, value: isNaN(numValue) ? 0 : numValue }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={commissionRuleForm.description}
                onChange={(e) => setCommissionRuleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description for this commission rule"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCommissionRuleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    // Validation
                    if (commissionRuleForm.scope === "service" && !commissionRuleForm.serviceId) {
                      toast.error("Please select a service");
                      return;
                    }
                    
                    // Prepare rule data (remove scope as it's not part of the API)
                    const ruleData: any = {
                      category: commissionRuleForm.category,
                      type: commissionRuleForm.type,
                      value: commissionRuleForm.value,
                      description: commissionRuleForm.description || "",
                      serviceId: commissionRuleForm.scope === "service" ? commissionRuleForm.serviceId : undefined,
                      businessId,
                    };
                    
                    // Only include staffId if it's set (for staff-specific rules)
                    // If undefined, it means "all staff" and should be null or omitted
                    if (commissionRuleForm.staffId !== undefined) {
                      ruleData.staffId = commissionRuleForm.staffId;
                    } else {
                      ruleData.staffId = null; // Explicitly set to null for "all staff"
                    }
                    
                    if (editingCommissionRule) {
                      await updateCommissionRule(editingCommissionRule.id!, ruleData);
                      toast.success("Commission rule updated successfully");
                    } else {
                      await createCommissionRule(ruleData);
                      toast.success(commissionRuleForm.staffId 
                        ? "Staff-specific commission rule created successfully" 
                        : "Commission rule created successfully");
                    }
                    // Refresh the rules list to show the new/updated rule
                    await refreshCommissionRules();
                    setIsCommissionRuleDialogOpen(false);
                    // Form will be reset by onOpenChange handler
                  } catch (error) {
                    toast.error("Failed to save commission rule");
                  }
                }}
              >
                {editingCommissionRule ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        setIsPaymentDialogOpen(open);
        if (open) {
          // Initialize form with total pending when dialog opens
          setPaymentForm({
            amount: totalPending,
            method: PaymentMethod.CASH,
            paymentDate: new Date().toISOString().split('T')[0],
            referenceNumber: "",
            notes: "",
          });
        } else {
          // Reset form when dialog closes
          setPaymentForm({
            amount: 0,
            method: PaymentMethod.CASH,
            paymentDate: new Date().toISOString().split('T')[0],
            referenceNumber: "",
            notes: "",
          });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Payment</DialogTitle>
            <DialogDescription>
              Create a payment for {selectedStaffer !== "All" ? apiStaff?.find(s => s.id.toString() === selectedStaffer)?.name : "selected staff"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Pending Commissions</p>
              <p className="text-2xl font-bold text-gray-900">${totalPending.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{pendingCommissions.length} commission{pendingCommissions.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.amount || totalPending}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentForm.method} 
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value as PaymentMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                  <SelectItem value={PaymentMethod.PAYPAL}>PayPal</SelectItem>
                  <SelectItem value={PaymentMethod.VENMO}>Venmo</SelectItem>
                  <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                type="text"
                placeholder="Check number, transaction ID, etc."
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this payment"
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await createPayment({
                      businessId,
                      staffId: selectedStaffIdForCommissions!,
                      amount: paymentForm.amount || totalPending,
                      method: paymentForm.method,
                      paymentDate: paymentForm.paymentDate,
                      commissionIds: pendingCommissions.map(c => c.id),
                      referenceNumber: paymentForm.referenceNumber || undefined,
                      notes: paymentForm.notes || undefined,
                    });
                    toast.success("Payment created successfully");
                    setIsPaymentDialogOpen(false);
                    // Reset form
                    setPaymentForm({
                      amount: 0,
                      method: PaymentMethod.CASH,
                      paymentDate: new Date().toISOString().split('T')[0],
                      referenceNumber: "",
                      notes: "",
                    });
                  } catch (error) {
                    toast.error("Failed to create payment");
                  }
                }}
              >
                Create Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Sheet - Same layout as Add Staff Page */}
      <Sheet open={isEditStaffDialogOpen} onOpenChange={(open) => {
        setIsEditStaffDialogOpen(open);
        if (!open) {
          setEditingStaff(null);
          setEditStaffForm({
            name: "",
            phone: "",
            email: "",
            position: "",
            permissionLevel: "",
            showInCalendar: true,
            availableForOnlineBooking: true,
            serviceIds: [],
          });
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-7xl overflow-y-auto p-0">
          <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-gray-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsEditStaffDialogOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                  <h1 className="text-xl font-bold text-white">
                    Edit Staff Member
                  </h1>
                </div>
                <Button
                  onClick={async () => {
                    if (!editingStaff || !editStaffForm.name.trim()) {
                      toast.error("Name is required");
                      return;
                    }
                    try {
                      await updateStaff(editingStaff.id, {
                        name: editStaffForm.name,
                        phone: editStaffForm.phone || undefined,
                        email: editStaffForm.email || undefined,
                        position: editStaffForm.position || undefined,
                        serviceIds: editStaffForm.serviceIds.length > 0 ? editStaffForm.serviceIds : undefined,
                      });
                      toast.success("Staff member updated successfully");
                      setIsEditStaffDialogOpen(false);
                      refreshStaff();
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to update staff member");
                    }
                  }}
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-700 text-white gap-2"
                  disabled={!editStaffForm.name.trim()}
                >
                  <Send size={16} />
                  SAVE CHANGES
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
                              {editingStaff ? (editingStaff.initials || getInitials(editingStaff.name)) : <UserPlus size={32} />}
                            </AvatarFallback>
                          </Avatar>
                          <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors">
                            <Pencil size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={editStaffForm.name}
                          onChange={(e) => setEditStaffForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter name"
                          autoFocus
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone number</Label>
                        <Input
                          id="edit-phone"
                          type="tel"
                          value={editStaffForm.phone}
                          onChange={(e) => setEditStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>

                      {/* E-mail */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-email">E-mail</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editStaffForm.email}
                          onChange={(e) => setEditStaffForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email"
                        />
                      </div>

                      {/* Permission Level */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-permission-level">Permission Level</Label>
                        <div className="relative">
                          <Select
                            value={editStaffForm.permissionLevel}
                            onValueChange={(value) => setEditStaffForm(prev => ({ ...prev, permissionLevel: value }))}
                          >
                            <SelectTrigger id="edit-permission-level" className="pr-10">
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
                        <Label htmlFor="edit-position">Position</Label>
                        <Input
                          id="edit-position"
                          value={editStaffForm.position}
                          onChange={(e) => setEditStaffForm(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="Enter position"
                        />
                      </div>

                      {/* Show Staff Member in Calendar */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="edit-show-in-calendar"
                          checked={editStaffForm.showInCalendar}
                          onCheckedChange={(checked) =>
                            setEditStaffForm(prev => ({ ...prev, showInCalendar: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <Label
                          htmlFor="edit-show-in-calendar"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Check the box if the Staff Member offers services and
                          should be visible in your Booksy Calendar.
                        </Label>
                      </div>

                      {/* Available for Online Booking */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="edit-online-booking"
                          checked={editStaffForm.availableForOnlineBooking}
                          onCheckedChange={(checked) =>
                            setEditStaffForm(prev => ({ ...prev, availableForOnlineBooking: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <Label
                          htmlFor="edit-online-booking"
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
                      ) : !apiServices || apiServices.length === 0 ? (
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
                          {apiServices.map((service) => {
                            const isSelected = editStaffForm.serviceIds.includes(service.id);
                            return (
                              <div
                                key={service.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEditStaffForm(prev => ({
                                        ...prev,
                                        serviceIds: [...prev.serviceIds, service.id]
                                      }));
                                    } else {
                                      setEditStaffForm(prev => ({
                                        ...prev,
                                        serviceIds: prev.serviceIds.filter(id => id !== service.id)
                                      }));
                                    }
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
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
