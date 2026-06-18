import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bell, Search, Settings, Plus, ChevronDown, ChevronUp, Calendar as CalendarIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, isToday, getDay, parse } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppointmentBlock, StaffAvatar, type Appointment, type Staff } from "@/components/calendar/AppointmentBlock";
import { AppointmentModal } from "@/components/calendar/AppointmentModal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, User, Heart, HelpCircle, ArrowRight, Clock, Check, ChevronsUpDown, Layers, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppointments, type Appointment as AppointmentType } from "@/hooks/useAppointments";
import { useServices } from "@/hooks/useServices";
import { useTimeOff } from "@/hooks/useTimeOff";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { clientService, Client } from "@/services/clientService";
import { useNavigation } from "@/utils/navigationUtils";

// Extended appointment type with date
interface AppointmentWithDate extends Appointment {
  date: Date;
  apiId?: number;
}

// Convert hook appointments to component format
const convertToComponentAppointment = (apt: AppointmentType): AppointmentWithDate => {
  return {
    id: apt.id,
    clientName: apt.clientName,
    service: apt.service,
    startTime: apt.startTime,
    endTime: apt.endTime,
    staffId: apt.staffId,
    color: apt.color as any,
    date: apt.date,
    apiId: apt.apiId,
  };
};

// Time slots from 00:00 to 23:59 with 15-minute intervals
// 24 hours * 4 slots per hour = 96 slots (00:00, 00:15, 00:30, 00:45, ..., 23:45)
// Note: isBusinessHour is not set here - it's checked dynamically per day
const generateTimeSlots = () => {
  return Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    
    return {
      time: timeString,
      label: minute === 0 ? `${hour.toString().padStart(2, "0")}:00` : `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      hour,
      minute,
      isHourMark: minute === 0,
    };
  });
};

function getAppointmentsForStaff(appointments: Appointment[], staffId: string): Appointment[] {
  return appointments.filter((apt) => apt.staffId === staffId);
}

function getTimeOffsForStaffAndDate(timeOffs: any[], staffId: string, date: Date): any[] {
  const dateStr = format(date, "yyyy-MM-dd");
  return timeOffs.filter((to) => {
    if (to.staffId.toString() !== staffId.toString()) return false;
    const startDate = parse(to.startDate, "yyyy-MM-dd", new Date());
    const endDate = parse(to.endDate, "yyyy-MM-dd", new Date());
    const currentDate = parse(dateStr, "yyyy-MM-dd", new Date());
    return currentDate >= startDate && currentDate <= endDate;
  });
}

function parseTime(time: string): number {
  const parts = time.split(":");
  const hour = parseInt(parts[0]);
  const minute = parseInt(parts[1] || "0");
  return hour * 60 + minute; // Total minutes from 00:00
}

// Slot height for better readability (20px per 15-minute slot)
const SLOT_HEIGHT = 20;

function getTimePosition(startTime: string, endTime: string, slotHeight: number = SLOT_HEIGHT): { top: number; height: number } {
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const duration = endMinutes - startMinutes;
  const top = (startMinutes / 15) * slotHeight; // 15-minute intervals
  const height = (duration / 15) * slotHeight;
  return { top, height };
}

// Convert pixel position to time string
function getTimeFromPosition(top: number, slotHeight: number = SLOT_HEIGHT): string {
  const slotIndex = Math.floor(top / slotHeight);
  const totalMinutes = slotIndex * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Add minutes to a time string
function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = parseTime(time) + minutes;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// This will be updated to use dynamic business hours
function isBusinessHour(hour: number, businessStartHour: number, businessEndHour: number): boolean {
  return hour >= businessStartHour && hour < businessEndHour;
}

// Check if a time range overlaps with any existing appointments
function hasTimeConflict(
  appointments: Appointment[],
  staffId: string,
  startTime: string,
  endTime: string
): boolean {
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  
  return appointments.some((apt) => {
    if (apt.staffId !== staffId) return false;
    
    const aptStartMinutes = parseTime(apt.startTime);
    const aptEndMinutes = parseTime(apt.endTime);
    
    // Check for overlap: new booking overlaps if:
    // - New start is within existing appointment (start >= aptStart && start < aptEnd)
    // - New end is within existing appointment (end > aptStart && end <= aptEnd)
    // - New booking completely contains existing appointment (start <= aptStart && end >= aptEnd)
    // - Existing appointment completely contains new booking (aptStart <= start && aptEnd >= end)
    return (
      (startMinutes >= aptStartMinutes && startMinutes < aptEndMinutes) || // Start overlaps
      (endMinutes > aptStartMinutes && endMinutes <= aptEndMinutes) || // End overlaps
      (startMinutes <= aptStartMinutes && endMinutes >= aptEndMinutes) || // New contains existing
      (aptStartMinutes <= startMinutes && aptEndMinutes >= endMinutes) // Existing contains new
    );
  });
}

// Check if two appointments overlap
function appointmentsOverlap(apt1: Appointment, apt2: Appointment): boolean {
  if (apt1.staffId !== apt2.staffId) return false;
  
  const start1 = parseTime(apt1.startTime);
  const end1 = parseTime(apt1.endTime);
  const start2 = parseTime(apt2.startTime);
  const end2 = parseTime(apt2.endTime);
  
  return (
    (start1 < end2 && end1 > start2)
  );
}

// Normalize time string to HH:mm format (handles HH:mm:ss)
function normalizeTime(timeStr: string): string {
  if (!timeStr) return "00:00";
  // If it's already in HH:mm format, return as is
  if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
  // If it's in HH:mm:ss format, extract HH:mm
  if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return timeStr.substring(0, 5);
  }
  return timeStr;
}

// Check if time off overlaps with appointment
function timeOffOverlapsAppointment(timeOff: any, appointment: Appointment, businessStartHour: number, businessEndHour: number): boolean {
  if (timeOff.staffId.toString() !== appointment.staffId.toString()) return false;
  
  // Normalize time formats and handle full day time offs
  const toStartTime = timeOff.isFullDay 
    ? `${businessStartHour.toString().padStart(2, "0")}:00` 
    : normalizeTime(timeOff.startTime || "00:00");
  const toEndTime = timeOff.isFullDay 
    ? `${businessEndHour.toString().padStart(2, "0")}:00` 
    : normalizeTime(timeOff.endTime || "23:59");
  const aptStartTime = normalizeTime(appointment.startTime);
  const aptEndTime = normalizeTime(appointment.endTime);
  
  const toStart = parseTime(toStartTime);
  const toEnd = parseTime(toEndTime);
  const aptStart = parseTime(aptStartTime);
  const aptEnd = parseTime(aptEndTime);
  
  return (toStart < aptEnd && toEnd > aptStart);
}

// Check if a new time off conflicts with existing time offs
function hasTimeOffConflict(
  existingTimeOffs: any[],
  staffId: string | number,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  isFullDay: boolean,
  businessStartHour: number,
  businessEndHour: number
): boolean {
  const staffIdStr = staffId.toString();
  const newStartDate = parse(startDate, "yyyy-MM-dd", new Date());
  const newEndDate = parse(endDate, "yyyy-MM-dd", new Date());
  
  // For full day time offs, use business hours for conflict detection
  const newStart = parseTime(isFullDay 
    ? `${businessStartHour.toString().padStart(2, "0")}:00` 
    : startTime);
  const newEnd = parseTime(isFullDay 
    ? `${businessEndHour.toString().padStart(2, "0")}:00` 
    : endTime);
  
  return existingTimeOffs.some((existing) => {
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
    const existingStart = parseTime(existing.isFullDay 
      ? `${businessStartHour.toString().padStart(2, "0")}:00` 
      : (existing.startTime || "00:00"));
    const existingEnd = parseTime(existing.isFullDay 
      ? `${businessEndHour.toString().padStart(2, "0")}:00` 
      : (existing.endTime || "23:59"));
    
    // Check for time overlap
    return (newStart < existingEnd && newEnd > existingStart);
  });
}

// Group appointments and time offs by conflicts
function groupConflictingItems(
  appointments: Appointment[], 
  timeOffs: any[],
  businessStartHour: number,
  businessEndHour: number
): Array<{ type: 'appointment' | 'timeoff'; item: any }[]> {
  const groups: Array<{ type: 'appointment' | 'timeoff'; item: any }[]> = [];
  const processedApts = new Set<string>();
  const processedTimeOffs = new Set<number>();
  
  // Process appointments first
  appointments.forEach((apt) => {
    if (processedApts.has(apt.id)) return;
    
    const conflictGroup: Array<{ type: 'appointment' | 'timeoff'; item: any }> = [
      { type: 'appointment', item: apt }
    ];
    processedApts.add(apt.id);
    
    // Find all overlapping items
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      
      // Check other appointments
      appointments.forEach((otherApt) => {
        if (processedApts.has(otherApt.id)) return;
        if (appointmentsOverlap(apt, otherApt)) {
          conflictGroup.push({ type: 'appointment', item: otherApt });
          processedApts.add(otherApt.id);
          foundNew = true;
        }
      });
      
      // Check time offs
      timeOffs.forEach((timeOff) => {
        if (processedTimeOffs.has(timeOff.id)) return;
        if (timeOffOverlapsAppointment(timeOff, apt, businessStartHour, businessEndHour)) {
          conflictGroup.push({ type: 'timeoff', item: timeOff });
          processedTimeOffs.add(timeOff.id);
          foundNew = true;
        }
      });
    }
    
    groups.push(conflictGroup);
  });
  
  // Process remaining time offs that don't conflict with appointments
  timeOffs.forEach((timeOff) => {
    if (processedTimeOffs.has(timeOff.id)) return;
    
    const conflictGroup: Array<{ type: 'appointment' | 'timeoff'; item: any }> = [
      { type: 'timeoff', item: timeOff }
    ];
    processedTimeOffs.add(timeOff.id);
    
    // Check if this time off conflicts with other time offs
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      timeOffs.forEach((otherTimeOff) => {
        if (processedTimeOffs.has(otherTimeOff.id)) return;
        if (timeOffOverlapsAppointment(timeOff, {
          id: otherTimeOff.id.toString(),
          staffId: otherTimeOff.staffId.toString(),
          startTime: otherTimeOff.isFullDay ? "00:00" : (otherTimeOff.startTime || "00:00"),
          endTime: otherTimeOff.isFullDay ? "23:59" : (otherTimeOff.endTime || "23:59"),
        } as Appointment, businessStartHour, businessEndHour)) {
          conflictGroup.push({ type: 'timeoff', item: otherTimeOff });
          processedTimeOffs.add(otherTimeOff.id);
          foundNew = true;
        }
      });
    }
    
    groups.push(conflictGroup);
  });
  
  return groups;
}

// Group appointments by conflicts - appointments that overlap are in the same group
function groupConflictingAppointments(appointments: Appointment[]): Appointment[][] {
  const groups: Appointment[][] = [];
  const processed = new Set<string>();
  
  appointments.forEach((apt) => {
    if (processed.has(apt.id)) return;
    
    // Find all appointments that conflict with this one
    const conflictGroup = [apt];
    processed.add(apt.id);
    
    // Find all overlapping appointments
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      appointments.forEach((otherApt) => {
        if (processed.has(otherApt.id)) return;
        
        // Check if this appointment conflicts with any in the current group
        const conflictsWithGroup = conflictGroup.some(groupApt => 
          appointmentsOverlap(groupApt, otherApt)
        );
        
        if (conflictsWithGroup) {
          conflictGroup.push(otherApt);
          processed.add(otherApt.id);
          foundNew = true;
        }
      });
    }
    
    groups.push(conflictGroup);
  });
  
  return groups;
}


export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const businessId = useBusinessId();
  
  const { getPath } = useNavigation();
  const { appointments: apiAppointments, staff: apiStaff, loading, createAppointment: createAppointmentAPI, deleteAppointment: deleteAppointmentAPI, websocketStatus } = useAppointments(businessId, currentDate);
  const { services } = useServices(businessId);
  const { timeOffs, createTimeOff } = useTimeOff(businessId);
  const { businessHours, getHoursForDay, getDefaultHours } = useBusinessHours(businessId);
  
  // Helper function to get business hours for any date
  // Note: If enabled=false in DB, it means the business is CLOSED on that day
  const getBusinessHoursForDate = (date: Date): { startHour: number; endHour: number; isEnabled: boolean } => {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[date.getDay()];
    const dayHours = getHoursForDay(dayOfWeek);
    
    // If day is explicitly disabled (enabled=false in DB), business is CLOSED - entire day is non-business
    if (dayHours && !dayHours.enabled) {
      return { startHour: 0, endHour: 0, isEnabled: false };
    }
    
    // If day has hours configured, use them
    if (dayHours?.enabled && dayHours?.startTime && dayHours?.endTime) {
      return {
        startHour: parseInt(dayHours.startTime.split(':')[0]),
        endHour: parseInt(dayHours.endTime.split(':')[0]),
        isEnabled: true
      };
    }
    
    // Fallback to default hours if day not configured
    const defaultHours = getDefaultHours();
    if (defaultHours) {
      return {
        startHour: parseInt(defaultHours.startTime.split(':')[0]),
        endHour: parseInt(defaultHours.endTime.split(':')[0]),
        isEnabled: true
      };
    }
    
    // No business hours configured at all - entire day is non-business
    return { startHour: 0, endHour: 0, isEnabled: false };
  };
  
  // Get business hours for current date (for day view)
  const { startHour: businessStartHour, endHour: businessEndHour } = getBusinessHoursForDate(currentDate);
  
  // Generate time slots (always 00:00-23:59, business hours checked dynamically per day)
  const timeSlots = generateTimeSlots();
  
  // Convert API appointments to component format (with error handling)
  const appointments: AppointmentWithDate[] = (apiAppointments || []).map(convertToComponentAppointment);
  
  // Convert staff with fallback to default staff if empty
  const staff: Staff[] = (apiStaff && apiStaff.length > 0) 
    ? apiStaff.map(s => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        initials: s.initials,
        workingHours: s.workingHours,
      }))
    : [{
        id: "1",
        name: "Staff Member",
        avatar: "",
        initials: "SM",
        workingHours: "10:00-19:00",
      }];

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthViewDate, setMonthViewDate] = useState(new Date());
  const [weekViewDate, setWeekViewDate] = useState(new Date());
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isHighlightOpen, setIsHighlightOpen] = useState(true);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const [viewType, setViewType] = useState<"Day" | "Month" | "Weekly">("Day");
  const [selectedDayForPopup, setSelectedDayForPopup] = useState<Date | null>(null);
  const [isDayPopupOpen, setIsDayPopupOpen] = useState(false);
  const [selectedWeeklyPopup, setSelectedWeeklyPopup] = useState<{ day: Date; staffId: string } | null>(null);
  const [isWeeklyPopupOpen, setIsWeeklyPopupOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ staffId: string; time: string } | null>(null);
  const [dragSelection, setDragSelection] = useState<{
    staffId: string;
    startTime: string; // Original click time
    endTime: string; // Current drag time
    isDragging: boolean;
    hasMoved: boolean;
  } | null>(null);
  const [selectionConflict, setSelectionConflict] = useState(false);
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [showAppointmentTimeOffConflictDialog, setShowAppointmentTimeOffConflictDialog] = useState(false);
  const [pendingAppointmentWithTimeOffData, setPendingAppointmentWithTimeOffData] = useState<any>(null);
  const [finalSelection, setFinalSelection] = useState<{
    staffId: string;
    staffName: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
  const [isAddTimeOffOpen, setIsAddTimeOffOpen] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: "",
    startDate: format(currentDate, "yyyy-MM-dd"),
    endDate: format(currentDate, "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    isFullDay: true,
    isRecurring: false,
    recurrencePattern: "",
    recurrenceEndDate: "",
    reason: "",
    isApproved: false,
  });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);
  const [showTimeOffConflictDialog, setShowTimeOffConflictDialog] = useState(false);
  const [pendingTimeOffData, setPendingTimeOffData] = useState<any>(null);
  
  // Clients state for dropdown
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  
  // Appointment form state
  const [appointmentForm, setAppointmentForm] = useState({
    clientId: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    serviceId: "",
    staffId: "",
    startTime: "",
    endTime: "",
    notes: "",
    price: "",
  });
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);

  // Load clients when form opens
  useEffect(() => {
    if (isNewAppointmentOpen) {
      loadClients();
    }
  }, [isNewAppointmentOpen]);

  const loadClients = async () => {
    try {
      const data = await clientService.getClientsByBusiness(businessId);
      setClients(data);
    } catch (error) {
      console.error("Failed to load clients:", error);
      // Don't show error toast, just log it
    }
  };

  // Update form when finalSelection changes and form is opened
  useEffect(() => {
    if (finalSelection && isNewAppointmentOpen) {
      setAppointmentForm(prev => ({
        ...prev,
        staffId: finalSelection.staffId || prev.staffId,
        startTime: finalSelection.startTime || prev.startTime,
        // Don't set endTime here - let it be calculated from service duration
        endTime: prev.endTime || finalSelection.endTime || "",
      }));
    }
  }, [finalSelection, isNewAppointmentOpen]);

  // Auto-calculate end time based on service duration when service or start time changes
  useEffect(() => {
    if (appointmentForm.serviceId && appointmentForm.startTime && isNewAppointmentOpen) {
      const selectedService = services.find(s => s.id.toString() === appointmentForm.serviceId);
      if (selectedService && selectedService.durationMinutes) {
        const calculatedEndTime = addMinutesToTime(appointmentForm.startTime, selectedService.durationMinutes);
        // Only update if the calculated time is different to avoid unnecessary re-renders
        setAppointmentForm(prev => {
          if (prev.endTime !== calculatedEndTime) {
            return {
              ...prev,
              endTime: calculatedEndTime,
            };
          }
          return prev;
        });
      }
    }
  }, [appointmentForm.serviceId, appointmentForm.startTime, services, isNewAppointmentOpen]);

  const goToPrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setMonthViewDate(new Date());
    setWeekViewDate(new Date());
  };

  const goToPrevMonth = () => setMonthViewDate(subMonths(monthViewDate, 1));
  const goToNextMonth = () => setMonthViewDate(addMonths(monthViewDate, 1));

  const goToPrevWeek = () => setWeekViewDate(subWeeks(weekViewDate, 1));
  const goToNextWeek = () => setWeekViewDate(addWeeks(weekViewDate, 1));

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): AppointmentWithDate[] => {
    return appointments.filter(apt => isSameDay(apt.date, date));
  };

  // Get appointments for a specific date and staff
  const getAppointmentsForDateAndStaff = (date: Date, staffId: string): AppointmentWithDate[] => {
    return appointments.filter(apt => isSameDay(apt.date, date) && apt.staffId === staffId);
  };

  // Get week days (Monday to Sunday)
  const getWeekDays = (date: Date): Date[] => {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Note: useAppointments and useTimeOff hooks already handle loading data
  // when currentDate changes and on mount. WebSocket handles all real-time updates.
  // No need for additional refresh logic here.

  // Check if current date is being viewed
  const isCurrentDate = isToday(currentDate);

  // Get current time position
  const getCurrentTimePosition = (): number | null => {
    if (!isCurrentDate) return null;
    
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    // Calculate position based on 15-minute slots
    return (totalMinutes / 15) * SLOT_HEIGHT;
  };

  const handleAppointmentClick = (appointment: Appointment | AppointmentWithDate) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Pre-fill the new appointment form with existing appointment data and open it
    setAppointmentForm({
      clientId: appointment.clientId ? String(appointment.clientId) : "",
      clientName: appointment.clientName || "",
      clientPhone: (appointment as any).clientPhone || "",
      clientEmail: (appointment as any).clientEmail || "",
      serviceId: appointment.service || "",
      staffId: appointment.staffId || "",
      startTime: appointment.startTime || "",
      endTime: appointment.endTime || "",
      notes: (appointment as any).notes || "",
      price: (appointment as any).price ? String((appointment as any).price) : "",
    });
    handleCloseModal();
    setIsNewAppointmentOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment?.apiId) {
      try {
        await deleteAppointmentAPI(appointment.apiId);
    handleCloseModal();
      } catch (error) {
        // Error already handled in hook
      }
    } else {
      toast.error("Appointment not found");
    }
  };

  const selectedStaff = selectedAppointment 
    ? staff.find((s) => s.id === selectedAppointment.staffId) 
    : undefined;

  // Calendar month navigation
  const calendarStart = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const prevMonth = () => setCalendarMonth(subMonths(calendarMonth, 1));
  const nextMonth = () => setCalendarMonth(addMonths(calendarMonth, 1));

  return (
    <AppLayout>
      <div className="flex h-full w-full overflow-hidden bg-white">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* WebSocket Status Indicator */}
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">WebSocket:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                websocketStatus === 'connected' ? 'bg-green-100 text-green-700' :
                websocketStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                websocketStatus === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {websocketStatus === 'connected' ? '🟢 Connected' :
                 websocketStatus === 'connecting' ? '🟡 Connecting...' :
                 websocketStatus === 'error' ? '🔴 Error' :
                 '⚪ Disconnected'}
              </span>
            </div>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading calendar...</p>
              </div>
            </div>
          )}

          {/* No Staff State */}
          {!loading && (!apiStaff || apiStaff.length === 0) && (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center max-w-md mx-auto px-6">
                <div className="mb-6 flex justify-center">
                  <div className="p-4 rounded-full bg-blue-100">
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  No Staff Members Found
                </h2>
                <p className="text-gray-600 mb-6">
                  You need to add staff to your business before you can manage appointments and bookings.
                </p>
                <Button
                  onClick={() => navigate(getPath("staff"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold"
                  size="lg"
                >
                  Add Staff to Your Business
                </Button>
              </div>
            </div>
          )}
          
          {/* Top Navigation Bar - Only show when staff exists */}
          {!loading && apiStaff && apiStaff.length > 0 && (
          <>
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {viewType}
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setViewType("Day")}>
                    Day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewType("Month")}>
                    Month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewType("Weekly")}>
                    Weekly
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
                className="font-semibold"
          >
                TODAY
          </Button>
              {viewType === "Day" && (
                <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
                    <ChevronLeft size={16} />
            </Button>
                  <Popover onOpenChange={(open) => {
                    if (open) {
                      // When opening, set the picker month to the current date's month
                      setDatePickerMonth(currentDate);
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="h-auto p-0 font-medium hover:bg-transparent">
                        <span className="text-sm font-medium">
                          {format(currentDate, "EEE, d MMM")}
            </span>
                        {/* Display business hours for current date */}
                        {(() => {
                          const { startHour, endHour, isEnabled } = getBusinessHoursForDate(currentDate);
                          if (!isEnabled) {
                            return (
                              <Badge variant="outline" className="ml-2 text-xs bg-gray-100 text-gray-600 border-gray-300">
                                Closed
                              </Badge>
                            );
                          }
                          const startTime = `${startHour.toString().padStart(2, "0")}:00`;
                          const endTime = `${endHour.toString().padStart(2, "0")}:00`;
                          return (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <Clock size={12} className="mr-1" />
                              {startTime} - {endTime}
                            </Badge>
                          );
                        })()}
                        <ChevronDown size={14} className="ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">
                            {format(datePickerMonth, "LLLL yyyy")}
                          </h3>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDatePickerMonth(subMonths(datePickerMonth, 1))}>
                              <ChevronLeft size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDatePickerMonth(addMonths(datePickerMonth, 1))}>
                              <ChevronRight size={14} />
            </Button>
          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1 w-8">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const monthStart = startOfMonth(datePickerMonth);
                            const monthEnd = endOfMonth(datePickerMonth);
                            const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                            const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                            const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                            
                            return days.map((day, idx) => {
                              const isCurrentMonth = isSameMonth(day, datePickerMonth);
                              const isSelected = isSameDay(day, currentDate);
                              const isTodayDate = isToday(day);
                              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                              
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setCurrentDate(day);
                                  }}
                                  className={cn(
                                    "h-8 w-8 text-xs rounded flex items-center justify-center relative",
                                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                                    isSelected ? "bg-black text-white" : "",
                                    isTodayDate && !isSelected ? "bg-blue-100 text-blue-700 font-semibold" : "",
                                    isWeekend && !isSelected && !isTodayDate ? "text-red-500" : "",
                                    !isSelected ? "hover:bg-muted" : ""
                                  )}
                                >
                                  {format(day, "d")}
                                  {isTodayDate && !isSelected && (
                                    <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
                    <ChevronRight size={16} />
            </Button>
          </div>
              )}
              {viewType === "Month" && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                    <ChevronLeft size={16} />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {format(monthViewDate, "MMMM yyyy")}
                    </span>
              <ChevronDown size={14} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                    <ChevronRight size={16} />
            </Button>
                </div>
              )}
              {viewType === "Weekly" && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
                    <ChevronLeft size={16} />
            </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {(() => {
                        const weekStart = startOfWeek(weekViewDate, { weekStartsOn: 1 });
                        const weekEnd = endOfWeek(weekViewDate, { weekStartsOn: 1 });
                        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
                      })()}
                    </span>
              <ChevronDown size={14} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
                    <ChevronRight size={16} />
            </Button>
          </div>
              )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell size={18} />
          </Button>
              <div className="flex items-center gap-2 border border-border rounded-md px-2 h-8">
                <Search size={16} className="text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="" 
                  className="w-32 border-0 outline-none text-sm bg-transparent"
                />
              </div>
        </div>
      </div>

      {/* Calendar Grid - Conditional based on view type */}
          {viewType === "Day" && (
          <div className="flex flex-1 overflow-auto bg-white relative">
            {/* Current Time Indicator - Full horizontal line across all columns */}
            {isCurrentDate && (() => {
              const timePosition = getCurrentTimePosition();
              if (timePosition === null) return null;
              
              return (
                <div
                  className="absolute left-24 right-0 z-30 pointer-events-none"
                  style={{
                    top: `${timePosition + 64}px`, // 64px for header height
                    height: '2px',
                  }}
                >
                  <div className="h-full bg-red-500 w-full" />
            </div>
              );
            })()}
            
            {/* Time Column */}
            <div className="w-24 shrink-0 border-r border-gray-200 bg-white sticky left-0 z-10 relative">
              <div className="h-16 border-b border-gray-200 bg-white"></div>
              
              {/* Current Time Indicator in Time Column - Time badge */}
              {isCurrentDate && (() => {
                const timePosition = getCurrentTimePosition();
                if (timePosition === null) return null;
                
                return (
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none"
                    style={{
                      top: `${timePosition + 64}px`, // 64px for header height
                    }}
                  >
                    <div className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-r shadow-md">
                      {format(currentTime, "HH:mm")}
        </div>
                  </div>
                );
              })()}
              
          {/* Hour rows - one row per hour */}
          {Array.from({ length: 24 }, (_, hour) => {
            // Use business hours for current date
            const { startHour, endHour, isEnabled } = getBusinessHoursForDate(currentDate);
            // If day is disabled (business closed), no hours are business hours
            const isBusiness = isEnabled && isBusinessHour(hour, startHour, endHour);
            const timeString = `${hour.toString().padStart(2, "0")}:00`;
            const hourHeight = 4 * SLOT_HEIGHT; // 4 slots per hour
            
            return (
            <div
              key={timeString}
              className={`px-2 flex items-center bg-white border-b ${isBusiness ? "border-gray-200" : "border-gray-300 border-dashed"}`}
              style={{ height: `${hourHeight}px` }}
            >
              <span className={`text-xs font-semibold ${isBusiness ? "text-gray-900" : "text-gray-400 line-through"}`}>
                {timeString}
              </span>
            </div>
          );
          })}
          
          {/* Business Closed Indicator */}
          {(() => {
            const { isEnabled } = getBusinessHoursForDate(currentDate);
            if (!isEnabled) {
              return (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-20 pointer-events-none">
                  <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-2 shadow-lg">
                    <span className="text-sm font-semibold text-gray-700">Business Closed</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

            {/* Staff Columns */}
        <div className="flex flex-1">
              {staff.map((staff) => {
                const dayAppointments = getAppointmentsForDate(currentDate);
                const staffAppointments = getAppointmentsForStaff(dayAppointments, staff.id);
                const staffTimeOffs = getTimeOffsForStaffAndDate(timeOffs, staff.id, currentDate);
                const [startHour, endHour] = (staff.workingHours || "10:00-19:00").split("-").map((h) => parseInt(h.split(":")[0]));
                
                // Get business hours for current date
                const { startHour: dayBusinessStartHour, endHour: dayBusinessEndHour, isEnabled: dayIsEnabled } = getBusinessHoursForDate(currentDate);
                
                return (
            <div
              key={staff.id}
                    className="min-w-[250px] flex-1 border-r border-gray-200 last:border-r-0 bg-white"
                  >
                    {/* Staff Header */}
                    <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {staff.initials}
                        </span>
                        <span className="text-sm font-medium">{staff.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {staff.workingHours}
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-muted-foreground" />
              </div>

                    {/* Appointments Area */}
                    <div 
                      className="relative select-none" 
                      style={{ height: `${timeSlots.length * SLOT_HEIGHT}px` }}
                      onMouseDown={(e) => {
                        // Allow selection even if clicking on or near appointments
                        // Only prevent if clicking directly on appointment content
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-appointment-block]')) {
                          return; // Don't start selection if clicking on appointment
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const startTime = getTimeFromPosition(clickY, SLOT_HEIGHT);
                        
                        // Allow selection of any time slot (including non-business hours)
                        setDragSelection({
                          staffId: staff.id,
                          startTime,
                          endTime: startTime,
                          isDragging: true,
                          hasMoved: false,
                        });
                      }}
                      onMouseMove={(e) => {
                        if (dragSelection && dragSelection.isDragging && dragSelection.staffId === staff.id) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickY = Math.max(0, Math.min(e.clientY - rect.top, timeSlots.length * SLOT_HEIGHT));
                          // Get the slot index (floor to get the slot the mouse is in)
                          const slotIndex = Math.floor(clickY / SLOT_HEIGHT);
                          const currentTime = getTimeFromPosition(slotIndex * SLOT_HEIGHT, SLOT_HEIGHT);
                          
                          // Allow selection of any time slot (including non-business hours)
                          // When dragging to a slot, we want to include that entire slot
                          // So if dragging to 13:15, we want to include the 13:15-13:30 block
                          // The end time should be the end of the slot the mouse is in
                          const endTime = addMinutesToTime(currentTime, 15);
                          
                          // Check for conflicts while dragging
                          const startMinutes = parseTime(dragSelection.startTime);
                          const endMinutes = parseTime(endTime);
                          let actualStart = startMinutes <= endMinutes ? dragSelection.startTime : endTime;
                          let actualEnd = startMinutes <= endMinutes ? endTime : dragSelection.startTime;
                          
                          const dayAppointments = appointments.filter((apt) =>
                            isSameDay(apt.date, currentDate)
                          );
                          const hasConflict = hasTimeConflict(dayAppointments, staff.id, actualStart, actualEnd);
                          
                          setDragSelection({
                            ...dragSelection,
                            endTime: endTime,
                            hasMoved: true,
                          });
                          setSelectionConflict(hasConflict);
                        }
                      }}
                      onMouseUp={(e) => {
                        if (dragSelection && dragSelection.isDragging && dragSelection.staffId === staff.id) {
                          const startMinutes = parseTime(dragSelection.startTime);
                          const endMinutes = parseTime(dragSelection.endTime);
                          
                          // Determine actual start and end (handle backward dragging)
                          let actualStart = startMinutes <= endMinutes ? dragSelection.startTime : dragSelection.endTime;
                          let actualEnd = startMinutes <= endMinutes ? dragSelection.endTime : dragSelection.startTime;
                          const actualStartMinutes = parseTime(actualStart);
                          let actualEndMinutes = parseTime(actualEnd);
                          
                          // If user just clicked (didn't drag), select a single 15-minute slot
                          // Example: Click 13:00 → 13:00-13:15
                          if (!dragSelection.hasMoved) {
                            actualEnd = addMinutesToTime(actualStart, 15);
                            actualEndMinutes = parseTime(actualEnd);
                          } else {
                            // For range selection:
                            // Example: Drag from 13:00 to 13:15 → 13:00-13:30
                            // The endTime is already the end of the slot (13:15 + 15 = 13:30)
                            // We just need to handle backward dragging correctly
                            if (startMinutes > endMinutes) {
                              // Dragging backward: swap start and end
                              // If dragging from 13:15 to 13:00, we want 13:00-13:30
                              const originalStartEnd = addMinutesToTime(dragSelection.startTime, 15);
                              actualStart = dragSelection.endTime; // Earlier time (13:00)
                              actualEnd = originalStartEnd; // End of original start slot (13:30)
                              actualEndMinutes = parseTime(actualEnd);
                            }
                            // If dragging forward, actualEnd is already correct (end of the slot)
                            // Example: 13:00 to 13:15 → endTime is 13:30, which is correct
                          }
                          
                          // Ensure we have a valid range (at least 15 minutes)
                          if (actualEndMinutes > actualStartMinutes) {
                            // Check for conflicts with existing appointments (for visual feedback only)
                            const dayAppointments = appointments.filter((apt) =>
                              isSameDay(apt.date, currentDate)
                            );
                            
                            const hasConflict = hasTimeConflict(dayAppointments, staff.id, actualStart, actualEnd);
                            
                            // Always allow booking - overlapping appointments are allowed
                            // Set final selection and keep it visible
                            setFinalSelection({
                              staffId: staff.id,
                              staffName: staff.name,
                              startTime: actualStart,
                              endTime: actualEnd,
                            });
                            setIsSelectionDialogOpen(true);
                            setSelectionConflict(hasConflict);
                          }
                          
                          // Keep drag selection visible but mark as not dragging
                          setDragSelection({
                            ...dragSelection,
                            isDragging: false,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        if (dragSelection && dragSelection.isDragging && dragSelection.staffId === staff.id) {
                          setDragSelection({
                            ...dragSelection,
                            isDragging: false,
                          });
                        }
                      }}
                    >
                      {/* Non-business hours overlay - calculated from actual business hours */}
                      {(() => {
                        // If day is disabled, show entire day as non-business
                        if (!dayIsEnabled) {
                  return (
                    <div
                              className="absolute left-0 right-0 bg-gray-50"
                      style={{
                                top: 0, 
                                height: `${24 * 4 * SLOT_HEIGHT}px`, // Entire day
                                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 16px)"
                              }}
                            />
                          );
                        }
                        
                        // Show non-business hours before start time
                        const beforeStart = dayBusinessStartHour > 0 ? (
                          <div 
                            key="before"
                            className="absolute left-0 right-0 bg-gray-50"
                            style={{ 
                              top: 0, 
                              height: `${dayBusinessStartHour * 4 * SLOT_HEIGHT}px`,
                              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 16px)"
                            }}
                          />
                        ) : null;
                        
                        // Show non-business hours after end time
                        const afterEnd = dayBusinessEndHour < 24 ? (
                          <div 
                            key="after"
                            className="absolute left-0 right-0 bg-gray-50"
                            style={{ 
                              top: `${dayBusinessEndHour * 4 * SLOT_HEIGHT}px`,
                              height: `${(24 - dayBusinessEndHour) * 4 * SLOT_HEIGHT}px`,
                              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 16px)"
                            }}
                          />
                        ) : null;
                        
                        return [beforeStart, afterEnd].filter(Boolean);
                      })()}

                      {/* Drag selection range highlight - show while dragging */}
                      {dragSelection && dragSelection.staffId === staff.id && dragSelection.isDragging && (
                        (() => {
                          const startMinutes = parseTime(dragSelection.startTime);
                          const endMinutes = parseTime(dragSelection.endTime);
                          
                          // Determine actual start and end for visual display (handle backward dragging)
                          let displayStart = startMinutes <= endMinutes ? dragSelection.startTime : dragSelection.endTime;
                          let displayEnd = startMinutes <= endMinutes ? dragSelection.endTime : dragSelection.startTime;
                          
                          // If end equals start (initial click), show at least 15 minutes for visual feedback
                          if (displayStart === displayEnd) {
                            displayEnd = addMinutesToTime(displayStart, 15);
                          }
                          
                          const { top, height } = getTimePosition(displayStart, displayEnd, SLOT_HEIGHT);
                          
                          // Always show the original start time and current end time (even if dragging backwards)
                          const showStartTime = startMinutes <= endMinutes ? dragSelection.startTime : dragSelection.endTime;
                          const showEndTime = startMinutes <= endMinutes ? dragSelection.endTime : dragSelection.startTime;
                          
                          // Check for conflict
                          const dayAppointments = appointments.filter((apt) =>
                            isSameDay(apt.date, currentDate)
                          );
                          const hasConflict = hasTimeConflict(dayAppointments, staff.id, displayStart, displayEnd);

                  return (
                    <div
                              className={`absolute left-0 right-0 border-2 z-15 pointer-events-none flex items-center ${
                                hasConflict 
                                  ? "bg-red-200/50 border-red-500" 
                                  : "bg-blue-200/50 border-blue-500"
                              }`}
                      style={{
                                top: `${top}px`,
                                height: `${Math.max(height, SLOT_HEIGHT)}px`,
                              }}
                            >
                              <div className={`text-xs font-medium px-2 whitespace-nowrap ${
                                hasConflict ? "text-red-700" : "text-blue-700"
                              }`}>
                                {showStartTime} - {showEndTime}
                                {hasConflict && " (Conflict)"}
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Final selection highlight - show when popup is open */}
                      {finalSelection && finalSelection.staffId === staff.id && (
                        (() => {
                          const { top, height } = getTimePosition(finalSelection.startTime, finalSelection.endTime, SLOT_HEIGHT);
                          
                          return (
                            <div
                              className="absolute left-0 right-0 bg-blue-200/50 border-2 border-blue-500 z-15 pointer-events-none flex items-center"
                              style={{
                                top: `${top}px`,
                                height: `${Math.max(height, SLOT_HEIGHT)}px`,
                              }}
                            >
                              <div className="text-xs font-medium text-blue-700 px-2 whitespace-nowrap">
                                {finalSelection.startTime} - {finalSelection.endTime}
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Appointments and Time Offs - Grouped by conflicts */}
                      {(() => {
                        const conflictGroups = groupConflictingItems(staffAppointments, staffTimeOffs, dayBusinessStartHour, dayBusinessEndHour);
                        const isDragging = dragSelection?.isDragging && dragSelection.staffId === staff.id;
                        
                        return conflictGroups.flatMap((group) => {
                          const groupSize = group.length;
                          
                          // For each item in the group, render it with calculated width/position
                          return group.map((item, itemIndex) => {
                            let top = 0;
                            let height = 0;
                            
                            if (item.type === 'appointment') {
                              const aptStartTime = normalizeTime(item.item.startTime);
                              const aptEndTime = normalizeTime(item.item.endTime);
                              const pos = getTimePosition(aptStartTime, aptEndTime, SLOT_HEIGHT);
                              top = pos.top;
                              height = pos.height;
                            } else {
                              // For full day time offs, show them only during business hours for this day (or 00:00-00:00 if disabled)
                              const startTime = item.item.isFullDay 
                                ? (dayIsEnabled ? `${dayBusinessStartHour.toString().padStart(2, "0")}:00` : "00:00")
                                : normalizeTime(item.item.startTime || "00:00");
                              const endTime = item.item.isFullDay 
                                ? (dayIsEnabled ? `${dayBusinessEndHour.toString().padStart(2, "0")}:00` : "00:00")
                                : normalizeTime(item.item.endTime || "23:59");
                              const pos = getTimePosition(startTime, endTime, SLOT_HEIGHT);
                              top = pos.top;
                              height = pos.height;
                            }
                            
                            // Calculate position: each item gets equal share of width
                            // Use percentage-based positioning with small gaps
                            const gapPercent = groupSize > 1 ? 0.3 : 0; // Small gap between items
                            const totalGapPercent = (groupSize - 1) * gapPercent;
                            const widthPercent = (100 - totalGapPercent) / groupSize;
                            const leftPercent = itemIndex * (widthPercent + gapPercent);

                            if (item.type === 'appointment') {
                              return (
                                <div
                                  key={item.item.id}
                                  className="absolute z-15"
                                  data-appointment-block="true"
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    left: groupSize === 1 
                                      ? '0.5rem' 
                                      : `calc(0.5rem + ${leftPercent}%)`,
                                    width: groupSize === 1 
                                      ? 'calc(100% - 1rem)' 
                                      : `calc(${widthPercent}% - ${gapPercent * 0.5}%)`,
                                    marginRight: itemIndex < groupSize - 1 ? `${gapPercent}%` : '0.5rem',
                                    pointerEvents: isDragging ? "none" : "auto",
                                  }}
                                  onClick={(e) => {
                                    // Only handle click if not dragging
                                    if (!isDragging) {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleAppointmentClick(item.item);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    // Only stop propagation if not dragging
                                    if (!isDragging) {
                                      e.stopPropagation();
                                    }
                                  }}
                                  onMouseUp={(e) => {
                                    // Only stop propagation if not dragging
                                    if (!isDragging) {
                                      e.stopPropagation();
                                    }
                      }}
                    >
                      <AppointmentBlock 
                                    appointment={item.item} 
                                    onClick={(e) => {
                                      // Only handle click if not dragging
                                      if (!isDragging) {
                                        e?.stopPropagation?.();
                                        handleAppointmentClick(item.item);
                                      }
                                    }}
                      />
                    </div>
                  );
                            } else {
                              // Time off block
                              const timeOff = item.item;
                              // For full day, use business hours for the specific day (or 00:00-00:00 if disabled)
                              const displayStartTime = timeOff.isFullDay 
                                ? (dayIsEnabled ? `${dayBusinessStartHour.toString().padStart(2, "0")}:00` : "00:00")
                                : normalizeTime(timeOff.startTime || "00:00");
                              const displayEndTime = timeOff.isFullDay 
                                ? (dayIsEnabled ? `${dayBusinessEndHour.toString().padStart(2, "0")}:00` : "00:00")
                                : normalizeTime(timeOff.endTime || "23:59");
                              const timeOffDate = parse(timeOff.startDate, "yyyy-MM-dd", new Date());
                              const dateStr = format(timeOffDate, "MMM d, yyyy");
                              const timeStr = timeOff.isFullDay ? "Full Day" : `${displayStartTime} - ${displayEndTime}`;
                              const typeStr = timeOff.isFullDay ? "Full Day" : "Specific Hours";
                              
                              // For non-full day time offs, ensure they're positioned within business hours if possible
                              // But still show them at their actual time
                              const minHeight = Math.max(height, SLOT_HEIGHT * 2); // Minimum height to show content
                              
                              return (
                                <div
                                  key={`timeoff-${timeOff.id}`}
                                  className="absolute bg-gray-100 border-2 border-gray-300 rounded z-15 pointer-events-auto cursor-pointer hover:bg-gray-200 transition-colors"
                                  style={{
                                    top: `${top}px`,
                                    height: `${minHeight}px`,
                                    left: groupSize === 1 
                                      ? '0.5rem' 
                                      : `calc(0.5rem + ${leftPercent}%)`,
                                    width: groupSize === 1 
                                      ? 'calc(100% - 1rem)' 
                                      : `calc(${widthPercent}% - ${gapPercent * 0.5}%)`,
                                    marginRight: itemIndex < groupSize - 1 ? `${gapPercent}%` : '0.5rem',
                                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 16px)"
                                  }}
                                  title={`Time Off: ${dateStr} ${timeStr} - ${timeOff.reason || 'No reason'}`}
                                >
                                  <div className="p-1.5 h-full flex flex-col text-xs">
                                    {/* All details at the top */}
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 truncate text-[11px]">
                                          Time Off
                                        </div>
                                        <div className="text-gray-700 text-[10px] mt-0.5 font-medium">
                                          {dateStr}
                                        </div>
                                        <div className="text-gray-600 text-[10px] mt-0.5">
                                          {timeStr}
                                        </div>
                                      </div>
                                      <Badge 
                                        variant="outline" 
                                        className="text-[9px] px-1.5 py-0 h-4 bg-gray-200 border-gray-400 text-gray-700 flex-shrink-0"
                                      >
                                        {typeStr}
                                      </Badge>
                                    </div>
                                    {/* Reason at the top as well */}
                                    {timeOff.reason && (
                                      <div className="text-gray-700 text-[10px] mt-0.5 line-clamp-2 font-medium">
                                        {timeOff.reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          });
                        });
                      })()}

                      {/* Time grid lines - after each hour's 4 slots (after 00:45, 01:45, etc.) */}
                {Array.from({ length: 24 }, (_, i) => {
                  const isBusiness = dayIsEnabled && isBusinessHour(i, dayBusinessStartHour, dayBusinessEndHour);
                  return (
                  <div
                    key={i}
                      className={`absolute left-0 right-0 border-b ${isBusiness ? "border-gray-200" : "border-gray-300 border-dashed"}`}
                      style={{ top: `${(i + 1) * 4 * SLOT_HEIGHT}px` }}
                    />
                  );
                })}
              </div>
            </div>
                );
              })}
            </div>
          </div>
          )}

          {viewType === "Month" && (
            <div className="flex flex-1 overflow-auto bg-white p-6">
              <div className="w-full">
                {/* Month Calendar Grid */}
                <div className="bg-white rounded-lg border border-gray-200">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div
                        key={day}
                        className="p-3 text-center text-xs font-medium text-muted-foreground border-r border-gray-200 last:border-r-0"
                      >
                        {day}
            </div>
          ))}
        </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7">
                    {(() => {
                      const monthStart = startOfMonth(monthViewDate);
                      const monthEnd = endOfMonth(monthViewDate);
                      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
                      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Monday
                      const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

                      return calendarDays.map((day, idx) => {
                        const dayAppointments = getAppointmentsForDate(day);
                        const isCurrentMonth = isSameMonth(day, monthViewDate);
                        const isCurrentDay = isToday(day);

                        return (
                          <div
                            key={idx}
                            className={`
                              min-h-[120px] border-r border-b border-gray-200 last:border-r-0
                              ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                              ${isCurrentDay ? "bg-blue-50" : ""}
                              p-2
                            `}
                          >
                            {/* Date Number */}
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`
                                  text-sm font-medium
                                  ${isCurrentDay ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}
                                  ${!isCurrentMonth ? "text-muted-foreground/50" : ""}
                                `}
                              >
                                {format(day, "d")}
                              </span>
                              {dayAppointments.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {dayAppointments.length}
                                </span>
                              )}
      </div>

                            {/* Appointments */}
                            <div className="space-y-1 mt-1">
                              {dayAppointments.slice(0, 3).map((apt) => (
                                <div
                                  key={apt.id}
                                  onClick={() => handleAppointmentClick(apt)}
                                  className={`
                                    text-xs p-1.5 rounded cursor-pointer truncate
                                    ${apt.color === "green" ? "bg-green-500 text-white" : ""}
                                    ${apt.color === "pink" ? "bg-pink-200 text-pink-900" : ""}
                                    ${apt.color === "blue" ? "bg-blue-200 text-blue-900" : ""}
                                    ${apt.color === "yellow" ? "bg-yellow-200 text-yellow-900" : ""}
                                    ${apt.color === "coral" ? "bg-orange-200 text-orange-900" : ""}
                                    ${apt.color === "purple" ? "bg-purple-200 text-purple-900" : ""}
                                    ${apt.color === "teal" ? "bg-teal-200 text-teal-900" : ""}
                                    ${apt.color === "orange" ? "bg-orange-200 text-orange-900" : ""}
                                    hover:opacity-80
                                  `}
                                  title={`${apt.startTime} - ${apt.endTime}: ${apt.service}`}
                                >
                                  <div className="text-[10px] font-medium">
                                    {apt.startTime} - {apt.endTime}
                                  </div>
                                  <div className="text-[10px] truncate font-semibold">
                                    {apt.clientName}
                                  </div>
                                  <div className="text-[10px] truncate">
                                    {apt.service}
              </div>
            </div>
          ))}
                              {dayAppointments.length > 3 && (
                                <div 
                                  className="text-xs text-muted-foreground text-center pt-1 cursor-pointer hover:text-foreground hover:font-medium transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDayForPopup(day);
                                    setIsDayPopupOpen(true);
                                  }}
                                >
                                  +{dayAppointments.length - 3} more
        </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewType === "Weekly" && (
            <div className="flex flex-1 overflow-auto bg-white">
              {/* Staff Column */}
              <div className="w-64 shrink-0 border-r border-gray-200 bg-white sticky left-0 z-10">
                <div className="h-16 border-b border-gray-200 bg-white"></div>
                <div className="divide-y divide-gray-200">
                  {staff.map((staff) => {
                    // All rows should have the same height to fit 3 blocks + "+X more" row
                    // Height: 3 blocks (~180px with spacing) + "+X more" row (~40px) + padding (~16px) = ~250px
                    const rowHeight = "h-[250px]";
                    
                    return (
                      <div
                        key={staff.id}
                        className={`${rowHeight} border-b border-gray-200 px-4 py-3 bg-white flex items-center gap-3`}
                      >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {staff.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="text-sm font-medium truncate">{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.workingHours}</div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Week Days Columns */}
              <div className="flex flex-1">
                {getWeekDays(weekViewDate).map((day) => {
                  const dayAppointments = getAppointmentsForDate(day);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className="min-w-[200px] flex-1 border-r border-gray-200 last:border-r-0 bg-white"
                    >
                      {/* Day Header */}
                      <div className={`h-16 border-b border-gray-200 flex flex-col items-center justify-center px-2 bg-white sticky top-0 z-10 ${isCurrentDay ? "bg-blue-50" : ""}`}>
                        <div className="text-xs font-medium text-muted-foreground">
                          {format(day, "EEE")}
                        </div>
                        <div className={`text-sm font-semibold ${isCurrentDay ? "text-blue-600" : ""}`}>
                          {format(day, "d")}
                        </div>
                        {dayAppointments.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {dayAppointments.length} {dayAppointments.length === 1 ? "reservation" : "reservations"}
                          </div>
                        )}
                      </div>

                      {/* Staff Rows with Appointments */}
                      <div className="divide-y divide-gray-200">
                        {staff.map((staff) => {
                          const staffAppointments = getAppointmentsForDateAndStaff(day, staff.id);
                          // All rows should have the same height to fit 3 blocks + "+X more" row
                          // Height: 3 blocks (~180px with spacing) + "+X more" row (~40px) + padding (~16px) = ~250px
                          const rowHeight = "h-[250px]";
                          
                          return (
                            <div
                              key={staff.id}
                              className={`${rowHeight} p-2 flex flex-col border-b border-gray-200`}
                            >
                              {staffAppointments.length > 0 ? (
                                <div className="flex flex-col h-full justify-between">
                                  {/* Appointment Blocks - Maximum 3 */}
                                  <div className="space-y-1">
                                    {staffAppointments.slice(0, 3).map((apt) => (
                                      <div
                                        key={apt.id}
                                        onClick={() => handleAppointmentClick(apt)}
                                        className={`
                                          text-xs p-1.5 rounded cursor-pointer
                                          ${apt.color === "green" ? "bg-green-500 text-white" : ""}
                                          ${apt.color === "pink" ? "bg-pink-200 text-pink-900" : ""}
                                          ${apt.color === "blue" ? "bg-blue-200 text-blue-900" : ""}
                                          ${apt.color === "yellow" ? "bg-yellow-200 text-yellow-900" : ""}
                                          ${apt.color === "coral" ? "bg-orange-200 text-orange-900" : ""}
                                          ${apt.color === "purple" ? "bg-purple-200 text-purple-900" : ""}
                                          ${apt.color === "teal" ? "bg-teal-200 text-teal-900" : ""}
                                          ${apt.color === "orange" ? "bg-orange-200 text-orange-900" : ""}
                                          hover:opacity-80
                                        `}
                                        title={`${apt.startTime} - ${apt.endTime}: ${apt.service}`}
                                      >
                                        <div className="text-[10px] font-medium truncate">
                                          {apt.startTime} - {apt.endTime}
                                        </div>
                                        <div className="text-[10px] truncate font-semibold">
                                          {apt.clientName}
                                        </div>
                                        <div className="text-[10px] truncate">
                                          {apt.service}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* "+X more" on separate row - Only show if more than 3 */}
                                  {staffAppointments.length > 3 && (
                                    <div 
                                      className="text-xs text-muted-foreground text-center pt-2 mt-auto cursor-pointer hover:text-foreground hover:font-medium transition-colors border-t border-gray-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedWeeklyPopup({ day, staffId: staff.id });
                                        setIsWeeklyPopupOpen(true);
                                      }}
                                    >
                                      +{staffAppointments.length - 3} more
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground/50">No appointments</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <button
            className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-900 transition-colors z-20"
            onClick={() => setIsNewAppointmentOpen(true)}
          >
            <Plus size={24} />
          </button>

      {/* Appointment Modal */}
      <AppointmentModal
        appointment={selectedAppointment}
        staff={selectedStaff}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
      />

      {/* Day Appointments Popup */}
      <Sheet open={isDayPopupOpen} onOpenChange={setIsDayPopupOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDayForPopup && format(selectedDayForPopup, "EEEE, MMMM d, yyyy")}
            </SheetTitle>
            <SheetDescription>
              {selectedDayForPopup && getAppointmentsForDate(selectedDayForPopup).length} {selectedDayForPopup && getAppointmentsForDate(selectedDayForPopup).length === 1 ? "appointment" : "appointments"}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-3">
            {selectedDayForPopup && getAppointmentsForDate(selectedDayForPopup).map((apt) => {
              const staffMember = staff.find(s => s.id === apt.staffId);
              return (
                <div
                  key={apt.id}
                  onClick={() => {
                    handleAppointmentClick(apt);
                    setIsDayPopupOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <AppointmentBlock 
                    appointment={apt} 
                    onClick={() => {
                      handleAppointmentClick(apt);
                      setIsDayPopupOpen(false);
                    }}
                  />
                  {staffMember && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <span>Staff:</span>
                      <span className="font-medium">{staffMember.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Weekly Appointments Popup */}
      <Sheet open={isWeeklyPopupOpen} onOpenChange={setIsWeeklyPopupOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedWeeklyPopup && (() => {
                const staffMember = staff.find(s => s.id === selectedWeeklyPopup.staffId);
                return `${staffMember?.name || "Staff"} - ${format(selectedWeeklyPopup.day, "EEEE, MMMM d, yyyy")}`;
              })()}
            </SheetTitle>
            <SheetDescription>
              {selectedWeeklyPopup && getAppointmentsForDateAndStaff(selectedWeeklyPopup.day, selectedWeeklyPopup.staffId).length} {selectedWeeklyPopup && getAppointmentsForDateAndStaff(selectedWeeklyPopup.day, selectedWeeklyPopup.staffId).length === 1 ? "appointment" : "appointments"}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-3">
            {selectedWeeklyPopup && getAppointmentsForDateAndStaff(selectedWeeklyPopup.day, selectedWeeklyPopup.staffId).map((apt) => {
              const staffMember = staff.find(s => s.id === apt.staffId);
              return (
                <div
                  key={apt.id}
                  onClick={() => {
                    handleAppointmentClick(apt);
                    setIsWeeklyPopupOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <AppointmentBlock 
                    appointment={apt} 
                    onClick={() => {
                      handleAppointmentClick(apt);
                      setIsWeeklyPopupOpen(false);
                    }}
                  />
                  {staff && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <span>Time:</span>
                      <span className="font-medium">{apt.startTime} - {apt.endTime}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Selection Dialog - Opens when time range is selected */}
      <Dialog open={isSelectionDialogOpen} onOpenChange={(open) => {
        setIsSelectionDialogOpen(open);
        if (!open) {
          // Clear selection when dialog closes
          setFinalSelection(null);
          setDragSelection(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Action</DialogTitle>
            <DialogDescription>
              {finalSelection && (
                <>
                  Selected time: {finalSelection.startTime} - {finalSelection.endTime}
                  <br />
                  Staff: {finalSelection.staffName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => {
                if (finalSelection) {
                  setIsSelectionDialogOpen(false);
                  setIsNewAppointmentOpen(true);
                }
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
            <Button
              onClick={() => {
                if (finalSelection) {
                  setIsSelectionDialogOpen(false);
                  // Pre-fill form with selected time before opening
                  setTimeOffForm({
                    staffId: finalSelection.staffId,
                    startDate: format(currentDate, "yyyy-MM-dd"),
                    endDate: format(currentDate, "yyyy-MM-dd"),
                    startTime: finalSelection.startTime,
                    endTime: finalSelection.endTime,
                    isFullDay: false, // When time is selected, it's not full day
                    isRecurring: false,
                    recurrencePattern: "",
                    recurrenceEndDate: "",
                    reason: "",
                    isApproved: false,
                  });
                  setIsAddTimeOffOpen(true);
                }
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Add Time Off
            </Button>
            <Button
              onClick={() => {
                if (finalSelection) {
                  setIsSelectionDialogOpen(false);
                  setIsAddReservationOpen(true);
                }
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Add Reservation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={(open) => {
        if (!open) {
          setShowConflictDialog(false);
          setPendingAppointmentData(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Time Conflict Detected</DialogTitle>
            <DialogDescription>
              This time slot conflicts with an existing appointment for this staff member.
              <br />
              <br />
              {pendingAppointmentData && (
                <>
                  <strong>Selected time:</strong> {pendingAppointmentData.startTime} - {pendingAppointmentData.endTime}
                  <br />
                  <strong>Date:</strong> {format(parse(pendingAppointmentData.appointmentDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
                </>
              )}
              <br />
              <br />
              Do you want to proceed and create this appointment anyway?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConflictDialog(false);
                setPendingAppointmentData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gray-600 hover:bg-gray-700"
              onClick={async () => {
                if (pendingAppointmentData) {
                  try {
                    await createAppointmentAPI(pendingAppointmentData);
                    setShowConflictDialog(false);
                    setPendingAppointmentData(null);
                    setIsNewAppointmentOpen(false);
                    setFinalSelection(null);
                    // Reset form
                    setAppointmentForm({
                      clientName: "",
                      clientPhone: "",
                      clientEmail: "",
                      serviceId: "",
                      staffId: "",
                      startTime: "",
                      endTime: "",
                      notes: "",
                      price: "",
                    });
                    toast.success("Appointment created successfully (with conflict)");
                  } catch (error) {
                    toast.error("Failed to create appointment");
                  }
                }
              }}
            >
              Yes, Create Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Conflict with Time Off Dialog */}
      <Dialog open={showAppointmentTimeOffConflictDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAppointmentTimeOffConflictDialog(false);
          setPendingAppointmentWithTimeOffData(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Time Off Conflict Detected</DialogTitle>
            <DialogDescription>
              This appointment conflicts with an existing time off for this staff member.
              <br />
              <br />
              {pendingAppointmentWithTimeOffData && (
                <>
                  <strong>Appointment time:</strong> {pendingAppointmentWithTimeOffData.startTime} - {pendingAppointmentWithTimeOffData.endTime}
                  <br />
                  <strong>Date:</strong> {format(parse(pendingAppointmentWithTimeOffData.appointmentDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
                </>
              )}
              <br />
              <br />
              <strong>Note:</strong> Appointments and time offs can overlap. They will be displayed side-by-side in the calendar.
              <br />
              <br />
              Do you want to proceed and create this appointment?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowAppointmentTimeOffConflictDialog(false);
                setPendingAppointmentWithTimeOffData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gray-600 hover:bg-gray-700"
              onClick={async () => {
                if (pendingAppointmentWithTimeOffData) {
                  try {
                    await createAppointmentAPI(pendingAppointmentWithTimeOffData);
                    setShowAppointmentTimeOffConflictDialog(false);
                    setPendingAppointmentWithTimeOffData(null);
                    setIsNewAppointmentOpen(false);
                    setFinalSelection(null);
                    // Reset form
                    setAppointmentForm({
                      clientName: "",
                      clientPhone: "",
                      clientEmail: "",
                      serviceId: "",
                      staffId: "",
                      startTime: "",
                      endTime: "",
                      notes: "",
                      price: "",
                    });
                    toast.success("Appointment created successfully");
                  } catch (error) {
                    toast.error("Failed to create appointment");
                  }
                }
              }}
            >
              Yes, Create Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Appointment Form - Slides in from right */}
      <Sheet open={isNewAppointmentOpen} onOpenChange={(open) => {
        setIsNewAppointmentOpen(open);
        if (!open) {
          // Reset form when closed
          setAppointmentForm({
            clientId: "",
            clientName: "",
            clientPhone: "",
            clientEmail: "",
            serviceId: "",
            staffId: "",
            startTime: "",
            endTime: "",
            notes: "",
            price: "",
          });
        }
      }}>
        <SheetContent side="right" className="!max-w-none w-[500px] p-0 flex flex-col h-screen max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <h2 className="text-base font-semibold">New Appointment</h2>
          </div>

          {/* Client Selection */}
          <div className="px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="space-y-2">
              <Label className="text-xs">Client (optional - leave empty for walk-in)</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="h-8 text-xs justify-between w-full"
                  >
                    {appointmentForm.clientId
                      ? (() => {
                          const selected = clients.find(c => c.id.toString() === appointmentForm.clientId);
                          return selected ? `${selected.firstName} ${selected.lastName || ""}`.trim() : "Select client...";
                        })()
                      : appointmentForm.clientName || "Select client or enter name..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="new-client"
                          onSelect={() => {
                            setAppointmentForm(prev => ({ ...prev, clientId: "", clientName: "", clientPhone: "", clientEmail: "" }));
                            setClientSearchOpen(false);
                          }}
                        >
                          <User className="mr-2 h-4 w-4" />
                          New client (enter manually)
                        </CommandItem>
                        {clients.map((client) => {
                          const isSelected = appointmentForm.clientId === client.id.toString();
                          return (
                            <CommandItem
                              key={client.id}
                              value={`${client.firstName} ${client.lastName || ""} ${client.email || ""} ${client.phone || ""}`}
                              onSelect={() => {
                                setAppointmentForm(prev => ({
                                  ...prev,
                                  clientId: client.id.toString(),
                                  clientName: `${client.firstName} ${client.lastName || ""}`.trim(),
                                  clientPhone: client.phone || "",
                                  clientEmail: client.email || "",
                                }));
                                setClientSearchOpen(false);
                              }}
                              className={cn("flex items-center justify-between", isSelected && "bg-accent")}
                            >
                              <div className="flex flex-col">
                                <span>{`${client.firstName} ${client.lastName || ""}`.trim()}</span>
                                {(client.email || client.phone) && (
                                  <span className="text-xs text-muted-foreground">
                                    {client.email || client.phone}
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="h-4 w-4" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {!appointmentForm.clientId && (
                <>
                  <Input
                    placeholder="Client name"
                    value={appointmentForm.clientName}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Phone"
                      value={appointmentForm.clientPhone}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={appointmentForm.clientEmail}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            <button className="px-3 py-2 text-xs font-medium border-b-2 border-gray-900 text-gray-900">
              APPOINTMENT
            </button>
            <button className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900">
              NOTES & INFO
            </button>
          </div>

          {/* Form Content - Scrollable if needed */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
            {/* Date/Time Controls */}
            <div className="flex gap-1.5">
              <Button variant="outline" className="flex-1 justify-between h-8 text-xs px-2">
                Today
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="outline" className="flex-1 h-8 text-xs px-2">
                <User className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">GROUP</span>
              </Button>
              <Button variant="outline" className="flex-1 h-8 text-xs px-2">
                <CalendarIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">RECURRING</span>
              </Button>
            </div>

            {/* Service Selection */}
            <div className="space-y-1">
              <Label className="text-xs">Select service *</Label>
              <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={serviceSearchOpen}
                    className="h-8 text-xs justify-between w-full"
                  >
                    {appointmentForm.serviceId
                      ? (() => {
                          const selected = services.find(s => s.id.toString() === appointmentForm.serviceId);
                          return selected ? selected.name : "Select service...";
                        })()
                      : "Select service..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput 
                      placeholder="Search services..." 
                    />
                    <CommandList>
                      <CommandEmpty>No service found.</CommandEmpty>
                      <CommandGroup>
                        {services.map((service) => {
                            const isSelected = appointmentForm.serviceId === service.id.toString();
                            const isCombo = service.serviceType === 'COMBO';
                            
                            return (
                              <CommandItem
                                key={service.id}
                                value={`${service.name} ${service.serviceType || 'SERVICE'}`}
                                onSelect={() => {
                                  setAppointmentForm(prev => ({ ...prev, serviceId: service.id.toString() }));
                                  setServiceSearchOpen(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="truncate">{service.name}</span>
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "text-xs shrink-0",
                                      isCombo 
                                        ? "bg-purple-100 text-purple-700 border-purple-200" 
                                        : "bg-blue-100 text-blue-700 border-blue-200"
                                    )}
                                  >
                                    {isCombo ? (
                                      <>
                                        <Package size={10} className="mr-1" />
                                        COMBO
                                      </>
                                    ) : (
                                      <>
                                        <Layers size={10} className="mr-1" />
                                        SERVICE
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                <span className="text-xs text-gray-500 ml-2 shrink-0">
                                  {service.price ? `${service.price.toFixed(2)} zł` : "Free"}
                                </span>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Add-ons */}
            <div className="space-y-1">
              <Label className="text-xs">Add-ons</Label>
              <div className="relative">
                <Input
                  placeholder="Add-ons"
                  className="pr-8 cursor-pointer h-8 text-xs"
                  readOnly
                />
                <ArrowRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start *</Label>
                <Select
                  value={appointmentForm.startTime}
                  onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, startTime: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.filter(slot => slot.minute === 0 || slot.minute === 15 || slot.minute === 30 || slot.minute === 45).map((slot) => (
                      <SelectItem key={slot.time} value={slot.time}>
                        {slot.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End *</Label>
                <Select
                  value={appointmentForm.endTime}
                  onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, endTime: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.filter(slot => slot.minute === 0 || slot.minute === 15 || slot.minute === 30 || slot.minute === 45).map((slot) => (
                      <SelectItem key={slot.time} value={slot.time}>
                        {slot.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {appointmentForm.serviceId && appointmentForm.startTime && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Auto-calculated from service duration
                  </p>
                )}
              </div>
            </div>

            {/* Staff Selection */}
            <div className="space-y-1">
              <Label className="text-xs">Staff *</Label>
              <Select
                value={appointmentForm.staffId}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, staffId: value }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Add notes..."
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="h-16 text-xs resize-none"
              />
            </div>

            {/* Client Request */}
            <div className="flex items-center gap-1.5 py-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Heart className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-gray-700">Requested by client</span>
              <Button variant="ghost" size="icon" className="h-3.5 w-3.5">
                <HelpCircle className="h-3 w-3 text-gray-400" />
              </Button>
            </div>

            {/* Add Another Service */}
            <Button variant="outline" className="w-full h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              ADD ANOTHER SERVICE
            </Button>

            {/* Financial Summary */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Total</Label>
                <span className="text-xs font-semibold">
                  {(() => {
                    const selectedService = services.find(s => s.id.toString() === appointmentForm.serviceId);
                    return selectedService?.price ? `${selectedService.price.toFixed(2)} zł` : "0,00 zł";
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">To be paid</Label>
                <span className="text-xs font-semibold">
                  {(() => {
                    const selectedService = services.find(s => s.id.toString() === appointmentForm.serviceId);
                    return selectedService?.price ? `${selectedService.price.toFixed(2)} zł` : "0,00 zł";
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={() => setIsNewAppointmentOpen(false)}
            >
              DISCARD
            </Button>
            <Button
              className="flex-1 h-8 text-xs bg-gray-600 hover:bg-gray-700"
              disabled={!appointmentForm.serviceId || !appointmentForm.staffId || !appointmentForm.startTime || !appointmentForm.endTime}
              onClick={async () => {
                try {
                  if (!appointmentForm.serviceId) {
                    toast.error("Please select a service");
                    return;
                  }
                  if (!appointmentForm.staffId) {
                    toast.error("Please select a staff member");
                    return;
                  }
                  if (!appointmentForm.startTime || !appointmentForm.endTime) {
                    toast.error("Please select start and end time");
                    return;
                  }
                  
                  const selectedService = services.find(s => s.id.toString() === appointmentForm.serviceId);
                  
                  // Check for conflicts before saving
                  const dayAppointments = appointments.filter((apt) =>
                    isSameDay(apt.date, currentDate)
                  );
                  const hasAppointmentConflict = hasTimeConflict(
                    dayAppointments,
                    appointmentForm.staffId,
                    appointmentForm.startTime,
                    appointmentForm.endTime
                  );
                  
                  // Check for conflicts with time offs
                  const dayTimeOffs = getTimeOffsForStaffAndDate(timeOffs || [], appointmentForm.staffId, currentDate);
                  const normalizedStartTime = normalizeTime(appointmentForm.startTime);
                  const normalizedEndTime = normalizeTime(appointmentForm.endTime);
                  const hasTimeOffConflictResult = dayTimeOffs.some((timeOff) => {
                    return timeOffOverlapsAppointment(timeOff, {
                      id: "temp",
                      staffId: appointmentForm.staffId,
                      startTime: normalizedStartTime,
                      endTime: normalizedEndTime,
                    } as Appointment, businessStartHour, businessEndHour);
                  });
                  
                  const appointmentData = {
                    staffId: parseInt(appointmentForm.staffId),
                    serviceId: parseInt(appointmentForm.serviceId),
                    appointmentDate: format(currentDate, 'yyyy-MM-dd'),
                    startTime: appointmentForm.startTime,
                    endTime: appointmentForm.endTime,
                    clientId: appointmentForm.clientId ? parseInt(appointmentForm.clientId) : undefined,
                    clientName: appointmentForm.clientName || undefined,
                    clientPhone: appointmentForm.clientPhone || undefined,
                    clientEmail: appointmentForm.clientEmail || undefined,
                    price: selectedService?.price,
                    notes: appointmentForm.notes || undefined,
                  };
                  
                  if (hasTimeOffConflictResult) {
                    // Show time off conflict dialog
                    setPendingAppointmentWithTimeOffData(appointmentData);
                    setShowAppointmentTimeOffConflictDialog(true);
                  } else if (hasAppointmentConflict) {
                    // Show appointment conflict dialog
                    setPendingAppointmentData(appointmentData);
                    setShowConflictDialog(true);
                  } else {
                    // No conflict, save directly
                    await createAppointmentAPI(appointmentData);
                    setIsNewAppointmentOpen(false);
                    setFinalSelection(null);
                    // Reset form
                    setAppointmentForm({
                      clientName: "",
                      clientPhone: "",
                      clientEmail: "",
                      serviceId: "",
                      staffId: "",
                      startTime: "",
                      endTime: "",
                      notes: "",
                      price: "",
                    });
                  }
                } catch (error) {
                  // Error already handled in hook
                }
              }}
            >
              CREATE APPOINTMENT
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Time Reservation Sheet */}
      <Sheet open={isAddReservationOpen} onOpenChange={setIsAddReservationOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] !max-w-none p-0 flex flex-col h-screen max-h-screen">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
            <SheetTitle className="text-base font-semibold text-gray-900">Add Time Reservation</SheetTitle>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Date</Label>
              <Select defaultValue="today">
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Start</Label>
              <Select defaultValue={finalSelection?.startTime || "10:45"}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.filter(slot => slot.minute === 0 || slot.minute === 15 || slot.minute === 30 || slot.minute === 45).map((slot) => (
                    <SelectItem key={slot.time} value={slot.time}>
                      {slot.time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">End</Label>
              <Select defaultValue={finalSelection?.endTime || "11:00"}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.filter(slot => slot.minute === 0 || slot.minute === 15 || slot.minute === 30 || slot.minute === 45).map((slot) => (
                    <SelectItem key={slot.time} value={slot.time}>
                      {slot.time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staffer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Staffer</Label>
              <Select defaultValue={finalSelection?.staffId || staff[0]?.id}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Reason</Label>
              <Textarea
                placeholder="Reason"
                className="min-h-[100px] text-sm resize-y"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="flex-1 h-9 text-sm"
              onClick={() => setIsAddReservationOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1 h-9 text-sm bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => {
                toast.success("Time reservation saved successfully");
                setIsAddReservationOpen(false);
              }}
            >
              SAVE
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Time Off Sheet */}
      <Sheet open={isAddTimeOffOpen} onOpenChange={(open) => {
        setIsAddTimeOffOpen(open);
        if (!open) {
          // Reset form when closed
          setTimeOffForm({
            staffId: "",
            startDate: format(currentDate, "yyyy-MM-dd"),
            endDate: format(currentDate, "yyyy-MM-dd"),
            startTime: "",
            endTime: "",
            isFullDay: true,
            isRecurring: false,
            recurrencePattern: "",
            recurrenceEndDate: "",
            reason: "",
            isApproved: false,
          });
          // Clear final selection when closing
          setFinalSelection(null);
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
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
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
                        // When switching to full day, clear time fields
                        setTimeOffForm(prev => ({ ...prev, startTime: "", endTime: "" }));
                      } else if (finalSelection) {
                        // When switching from full day and we have a selection, restore times
                        setTimeOffForm(prev => ({
                          ...prev,
                          startTime: finalSelection.startTime,
                          endTime: finalSelection.endTime,
                        }));
                      }
                    }}
                  />
                  <Label htmlFor="full-day" className="text-sm font-normal cursor-pointer">
                    Full Day
                  </Label>
                </div>
              </div>
              {/* Show selected time info when opened from calendar selection */}
              {!timeOffForm.isFullDay && timeOffForm.startTime && timeOffForm.endTime && (
                <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <span className="font-medium">Selected time:</span> {timeOffForm.startTime} - {timeOffForm.endTime}
                </div>
              )}
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
            {!timeOffForm.isFullDay && (() => {
              // Get business hours for the selected date
              const selectedDate = timeOffForm.startDate ? parse(timeOffForm.startDate, "yyyy-MM-dd", new Date()) : currentDate;
              const { startHour: dayStartHour, endHour: dayEndHour, isEnabled: dayIsEnabled } = getBusinessHoursForDate(selectedDate);
              
              // Calculate min and max times based on business hours
              const minTime = dayIsEnabled ? `${dayStartHour.toString().padStart(2, "0")}:00` : "00:00";
              const maxTime = dayIsEnabled ? `${dayEndHour.toString().padStart(2, "0")}:00` : "23:59";
              
              return (
                <div className="space-y-3">
                  {!dayIsEnabled && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                      Business is closed on this day. Please select a different date.
                    </div>
                  )}
                  {dayIsEnabled && (
                    <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                      Business hours: {minTime} - {maxTime}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-700">Start Time *</Label>
                      <Input
                        type="time"
                        value={timeOffForm.startTime}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
                          setTimeOffForm(prev => ({ ...prev, startTime: newStartTime }));
                          
                          // Validate start time is within business hours
                          if (dayIsEnabled && newStartTime) {
                            const startHour = parseInt(newStartTime.split(':')[0]);
                            if (startHour < dayStartHour || startHour >= dayEndHour) {
                              toast.error(`Start time must be within business hours (${minTime} - ${maxTime})`);
                            }
                          }
                        }}
                        min={minTime}
                        max={maxTime}
                        className="h-9 text-sm"
                        disabled={!dayIsEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-700">End Time *</Label>
                      <Input
                        type="time"
                        value={timeOffForm.endTime}
                        onChange={(e) => {
                          const newEndTime = e.target.value;
                          setTimeOffForm(prev => ({ ...prev, endTime: newEndTime }));
                          
                          // Validate end time is within business hours
                          if (dayIsEnabled && newEndTime) {
                            const endHour = parseInt(newEndTime.split(':')[0]);
                            if (endHour <= dayStartHour || endHour > dayEndHour) {
                              toast.error(`End time must be within business hours (${minTime} - ${maxTime})`);
                            }
                          }
                        }}
                        min={minTime}
                        max={maxTime}
                        className="h-9 text-sm"
                        disabled={!dayIsEnabled}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

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

                // Get business hours for the time off start date
                const timeOffStartDate = parse(timeOffForm.startDate, "yyyy-MM-dd", new Date());
                const { startHour: timeOffDayStartHour, endHour: timeOffDayEndHour, isEnabled: timeOffDayEnabled } = getBusinessHoursForDate(timeOffStartDate);
                
                // If day is disabled, reject time off
                if (!timeOffDayEnabled) {
                  toast.error("Cannot create time off on a day when the business is closed");
                  return;
                }
                
                // If not full day, validate that time is within business hours
                if (!timeOffForm.isFullDay && timeOffForm.startTime && timeOffForm.endTime) {
                  const startHour = parseInt(timeOffForm.startTime.split(':')[0]);
                  const startMinute = parseInt(timeOffForm.startTime.split(':')[1] || '0');
                  const endHour = parseInt(timeOffForm.endTime.split(':')[0]);
                  const endMinute = parseInt(timeOffForm.endTime.split(':')[1] || '0');
                  
                  // Check if start time is before business hours
                  if (startHour < timeOffDayStartHour || (startHour === timeOffDayStartHour && startMinute < 0)) {
                    toast.error(`Start time must be within business hours (${timeOffDayStartHour.toString().padStart(2, "0")}:00 - ${timeOffDayEndHour.toString().padStart(2, "0")}:00)`);
                    return;
                  }
                  
                  // Check if end time is after business hours
                  if (endHour > timeOffDayEndHour || (endHour === timeOffDayEndHour && endMinute > 0)) {
                    toast.error(`End time must be within business hours (${timeOffDayStartHour.toString().padStart(2, "0")}:00 - ${timeOffDayEndHour.toString().padStart(2, "0")}:00)`);
                    return;
                  }
                  
                  // Check if start time is after end time
                  if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
                    toast.error("Start time must be before end time");
                    return;
                  }
                }
                
                // If day is disabled, use 0-0 (no business hours) - but we already checked above
                const effectiveStartHour = timeOffDayEnabled ? timeOffDayStartHour : 0;
                const effectiveEndHour = timeOffDayEnabled ? timeOffDayEndHour : 0;
                
                // Check for conflicts with other time offs (NOT ALLOWED)
                const startTime = timeOffForm.isFullDay 
                  ? `${effectiveStartHour.toString().padStart(2, "0")}:00` 
                  : (timeOffForm.startTime || "00:00");
                const endTime = timeOffForm.isFullDay 
                  ? `${effectiveEndHour.toString().padStart(2, "0")}:00` 
                  : (timeOffForm.endTime || "23:59");
                
                const hasTimeOffConflictResult = hasTimeOffConflict(
                  timeOffs,
                  timeOffForm.staffId,
                  timeOffForm.startDate,
                  timeOffForm.endDate,
                  startTime,
                  endTime,
                  timeOffForm.isFullDay,
                  effectiveStartHour,
                  effectiveEndHour
                );
                
                if (hasTimeOffConflictResult) {
                  toast.error("This time off conflicts with an existing time off for this staff member. Please choose a different time.");
                  return;
                }
                
                // Check for conflicts with appointments (ALLOWED - will show side-by-side)
                const timeOffDate = parse(timeOffForm.startDate, "yyyy-MM-dd", new Date());
                const dayAppointments = appointments.filter((apt) =>
                  isSameDay(apt.date, timeOffDate)
                );
                
                const hasAppointmentConflict = hasTimeConflict(dayAppointments, timeOffForm.staffId, startTime, endTime);
                
                if (hasAppointmentConflict) {
                  // Show conflict dialog - appointments are allowed but will display side-by-side
                  setPendingTimeOffData({
                    staffId: timeOffForm.staffId,
                    startDate: timeOffForm.startDate,
                    endDate: timeOffForm.endDate,
                    startTime,
                    endTime,
                    isFullDay: timeOffForm.isFullDay,
                    reason: timeOffForm.reason,
                  });
                  setShowTimeOffConflictDialog(true);
                  return;
                }

                // No conflict, proceed with creation
                try {
                  await createTimeOff({
                    businessId: businessId,
                    staffId: parseInt(timeOffForm.staffId),
                    startDate: timeOffForm.startDate,
                    endDate: timeOffForm.endDate,
                    startTime: timeOffForm.isFullDay ? undefined : timeOffForm.startTime || undefined,
                    endTime: timeOffForm.isFullDay ? undefined : timeOffForm.endTime || undefined,
                    isFullDay: timeOffForm.isFullDay,
                    isRecurring: timeOffForm.isRecurring,
                    recurrencePattern: timeOffForm.isRecurring ? timeOffForm.recurrencePattern : undefined,
                    recurrenceEndDate: timeOffForm.isRecurring && timeOffForm.recurrenceEndDate ? timeOffForm.recurrenceEndDate : undefined,
                    reason: timeOffForm.reason,
                    isApproved: timeOffForm.isApproved,
                  });
                  
                  setIsAddTimeOffOpen(false);
                  setTimeOffForm({
                    staffId: "",
                    startDate: format(currentDate, "yyyy-MM-dd"),
                    endDate: format(currentDate, "yyyy-MM-dd"),
                    startTime: "",
                    endTime: "",
                    isFullDay: true,
                    isRecurring: false,
                    recurrencePattern: "",
                    recurrenceEndDate: "",
                    reason: "",
                    isApproved: false,
                  });
                } catch (error) {
                  // Error creating time off - handled by toast
                }
              }}
            >
              SAVE
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Time Off Conflict Confirmation Dialog */}
      <Dialog open={showTimeOffConflictDialog} onOpenChange={(open) => {
        if (!open) {
          setShowTimeOffConflictDialog(false);
          setPendingTimeOffData(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Appointment Conflict Detected</DialogTitle>
            <DialogDescription>
              This time off conflicts with an existing appointment for this staff member.
              <br />
              <br />
              {pendingTimeOffData && (
                <>
                  <strong>Time off:</strong> {pendingTimeOffData.startTime} - {pendingTimeOffData.endTime}
                  <br />
                  <strong>Date:</strong> {format(parse(pendingTimeOffData.startDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
                  {pendingTimeOffData.isFullDay && <span> (Full Day)</span>}
                  <br />
                  <strong>Reason:</strong> {pendingTimeOffData.reason}
                </>
              )}
              <br />
              <br />
              <strong>Note:</strong> Time offs and appointments can overlap. They will be displayed side-by-side in the calendar.
              <br />
              <br />
              Do you want to proceed and create this time off?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowTimeOffConflictDialog(false);
                setPendingTimeOffData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gray-600 hover:bg-gray-700"
              onClick={async () => {
                setShowTimeOffConflictDialog(false);
                try {
                  await createTimeOff({
                    businessId: businessId,
                    staffId: parseInt(timeOffForm.staffId),
                    startDate: timeOffForm.startDate,
                    endDate: timeOffForm.endDate,
                    startTime: timeOffForm.isFullDay ? undefined : timeOffForm.startTime || undefined,
                    endTime: timeOffForm.isFullDay ? undefined : timeOffForm.endTime || undefined,
                    isFullDay: timeOffForm.isFullDay,
                    isRecurring: timeOffForm.isRecurring,
                    recurrencePattern: timeOffForm.isRecurring ? timeOffForm.recurrencePattern : undefined,
                    recurrenceEndDate: timeOffForm.isRecurring && timeOffForm.recurrenceEndDate ? timeOffForm.recurrenceEndDate : undefined,
                    reason: timeOffForm.reason,
                    isApproved: timeOffForm.isApproved,
                  });
                  
                  setIsAddTimeOffOpen(false);
                  setTimeOffForm({
                    staffId: "",
                    startDate: format(currentDate, "yyyy-MM-dd"),
                    endDate: format(currentDate, "yyyy-MM-dd"),
                    startTime: "",
                    endTime: "",
                    isFullDay: true,
                    isRecurring: false,
                    recurrencePattern: "",
                    recurrenceEndDate: "",
                    reason: "",
                    isApproved: false,
                  });
                  setPendingTimeOffData(null);
                } catch (error) {
                  // Error creating time off - handled by toast
                }
              }}
            >
              Create Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
          </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
