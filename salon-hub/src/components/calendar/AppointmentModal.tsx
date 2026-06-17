import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Edit, Trash2, ArrowRight, Calendar as CalendarIcon, ChevronDown, XCircle } from "lucide-react";
import type { Appointment, Staff } from "./AppointmentBlock";
import { appointmentService, type Appointment as ApiAppointment } from "@/services/appointmentService";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AppointmentModalProps {
  appointment: Appointment | null;
  staff: Staff | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => void;
}

export function AppointmentModal({
  appointment,
  staff,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: AppointmentModalProps) {
  const [fullAppointment, setFullAppointment] = useState<ApiAppointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (isOpen && appointment?.apiId) {
      setLoading(true);
      appointmentService.getAppointmentById(appointment.apiId)
        .then((data) => {
          setFullAppointment(data);
        })
        .catch((error) => {
          // Error fetching appointment details - handled by toast
          toast.error("Failed to load appointment details");
          // Fallback to the appointment data we have
          setFullAppointment(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (isOpen && !appointment?.apiId) {
      // If no API ID, use the appointment data we have
      setFullAppointment(null);
    }
  }, [isOpen, appointment?.apiId]);

  if (!appointment) return null;

  // Use full appointment data if available, otherwise fallback to appointment prop
  const appointmentData = fullAppointment || (appointment as any);
  const clientPhone = appointmentData.clientPhone || "";
  const clientEmail = appointmentData.clientEmail || "";
  const notes = appointmentData.notes || "";
  const price = appointmentData.price || 0;
  const status = appointmentData.status || "PENDING";
  const paymentStatus = appointmentData.paymentStatus || "PENDING";
  const appointmentDate = appointmentData.appointmentDate || (appointment.date ? format(appointment.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="!max-w-none w-[500px] p-0 flex flex-col h-screen max-h-screen">
        {/* Header with Cancel button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold">Appointment</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-gray-500">Loading...</span>}
            {status !== "CANCELLED" && status !== "COMPLETED" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => {
                  setCancelDialogOpen(true);
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Client Selection */}
        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="space-y-2">
            <Label className="text-xs">Client</Label>
            <Input
              value={appointment.clientName}
              readOnly
              className="h-8 text-xs bg-gray-50"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={clientPhone}
                placeholder="Phone"
                readOnly
                className="h-8 text-xs bg-gray-50"
              />
              <Input
                value={clientEmail}
                placeholder="Email"
                type="email"
                readOnly
                className="h-8 text-xs bg-gray-50"
              />
            </div>
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
            <Button variant="outline" className="flex-1 justify-between h-8 text-xs px-2" disabled>
              {appointmentDate ? format(parse(appointmentDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'Today'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            <Button variant="outline" className="flex-1 h-8 text-xs px-2" disabled>
              <User className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">GROUP</span>
            </Button>
            <Button variant="outline" className="flex-1 h-8 text-xs px-2" disabled>
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">RECURRING</span>
            </Button>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              Status: {status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Payment: {paymentStatus}
            </Badge>
          </div>

          {/* Service Selection */}
          <div className="space-y-1">
            <Label className="text-xs">Service</Label>
            <div className="relative">
              <Input
                value={appointment.service}
                readOnly
                className="pr-8 h-8 text-xs bg-gray-50"
              />
            </div>
          </div>

          {/* Add-ons */}
          <div className="space-y-1">
            <Label className="text-xs">Add-ons</Label>
            <div className="relative">
              <Input
                placeholder="Add-ons"
                className="pr-8 cursor-pointer h-8 text-xs bg-gray-50"
                readOnly
              />
              <ArrowRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Select value={appointment.startTime} disabled>
                <SelectTrigger className="h-8 text-xs bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Select value={appointment.endTime} disabled>
                <SelectTrigger className="h-8 text-xs bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
              </Select>
            </div>
          </div>

          {/* Staff Selection */}
          <div className="space-y-1">
            <Label className="text-xs">Staff</Label>
            <Select value={appointment.staffId} disabled>
              <SelectTrigger className="h-8 text-xs bg-gray-50">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff && (
                  <SelectItem value={staff.id}>
                    {staff.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              placeholder="Add notes..."
              readOnly
              className="h-16 text-xs resize-none bg-gray-50"
            />
          </div>

          {/* Financial Summary */}
          <div className="pt-2 border-t border-gray-200 space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">Total</Label>
              <span className="text-xs font-semibold">
                {price ? `${price.toFixed(2)} zł` : "0,00 zł"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">To be paid</Label>
              <span className="text-xs font-semibold">
                {price ? `${price.toFixed(2)} zł` : "0,00 zł"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => setCancelDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            CANCEL
          </Button>
          <Button
            className="flex-1 h-8 text-xs bg-gray-600 hover:bg-gray-700"
            onClick={() => onEdit(appointment)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            EDIT
          </Button>
        </div>
      </SheetContent>

      {/* Cancel Appointment Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason("");
                }}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!cancelReason.trim()) {
                    toast.error("Please provide a cancellation reason");
                    return;
                  }
                  
                  if (appointment?.apiId) {
                    try {
                      await appointmentService.cancelAppointment(appointment.apiId, cancelReason);
                      toast.success("Appointment cancelled successfully");
                      setCancelDialogOpen(false);
                      setCancelReason("");
                      onClose();
                      // Refresh appointments
                      window.location.reload();
                    } catch (error: any) {
                      toast.error(error.message || "Failed to cancel appointment");
                    }
                  } else if (appointment?.id) {
                    onDelete(appointment.id);
                    setCancelDialogOpen(false);
                    setCancelReason("");
                  }
                }}
                disabled={!cancelReason.trim()}
              >
                Cancel Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
