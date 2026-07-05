import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { User, Plus, Trash2, ArrowLeft, Search, Receipt, CreditCard, X, Send, MoreVertical, Edit2, Save, Check, X as XIcon } from "lucide-react";
import { format } from "date-fns";
import PaymentMethodPage from "./PaymentMethodPage";
import { useServices } from "@/hooks/useServices";
import { useAddons } from "@/hooks/useAddons";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useStaff } from "@/hooks/useStaff";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Service } from "@/services/serviceService";
import { quickSaleService, type QuickSaleItem as QuickSaleItemAPI } from "@/services/quickSaleService";
import { appointmentService, type Appointment } from "@/services/appointmentService";
import { categoryService, type Category } from "@/services/categoryService";
import { websocketService } from "@/services/websocketService";
import { saleService, type CreateSaleRequest } from "@/services/saleService";
import { paymentConfirmationService, type PaymentConfirmationRequest } from "@/services/paymentConfirmationService";

// Helper function to filter and sort unsettled appointments
const filterAndSortUnsettledAppointments = (appointments: Appointment[]): Appointment[] => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return appointments
    .filter(apt => {
      // Check if appointment is for today
      const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      return aptDate === today &&
        apt.status !== 'CANCELLED' && 
        apt.status !== 'NO_SHOW' &&
        (apt.paymentStatus === 'PENDING' || apt.paymentStatus === 'PARTIALLY_REFUNDED');
    })
    .sort((a, b) => {
      // Compare start times (HH:mm format)
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
};

// Sidebar category definitions (module-level constant — not the categories state inside the component)
const SALE_CATEGORIES = [
  { id: "quick-sale", name: "QUICK SALE", active: true },
  { id: "to-be-settled", name: "TO BE SETTLED" },
  { id: "services", name: "SERVICES" },
  { id: "extras", name: "EXTRAS" },
];

// Transaction interface for display
interface Transaction {
  id: string;
  time: string;
  date: string;
  description: string;
  status: string;
  amount: string;
  paymentMethod: string;
  splitCashAmount?: number;
  splitCardAmount?: number;
  billNumber?: string;
  billId?: string;
  clientName?: string;
  address?: string;
  items: Array<{
    name: string;
    duration?: string;
    quantity: number;
    price: string;
  }>;
  appointmentDate?: string;
  staffName?: string;
  tax: {
    rate: string;
    netWorth: string;
    taxAmount: string;
    grossValue: string;
  };
  addition: string;
  discount: string;
  tip: string;
  total: string;
  paidDate: string;
  sale: Sale; // Keep reference to original sale
}

// Quick sale item type for display
interface QuickSaleItem {
  id: string;
  name: string;
  duration: string;
  price: string;
  color: string;
  type: 'service' | 'combo';
  serviceId?: number;
}

export default function SalesPage() {
  const navigate = useNavigate();
  const businessId = useBusinessId();
  const { services, loading: servicesLoading } = useServices(businessId);
  const { addons, loading: addonsLoading } = useAddons(businessId);
  const { staff } = useStaff(businessId);
  const [activeTab, setActiveTab] = useState("NEW SALES");
  const [activeCategory, setActiveCategory] = useState("quick-sale");
  
  // Sidebar categories - defined inside component to ensure accessibility
  const sidebarCategories = [
    { id: "quick-sale", name: "QUICK SALE", active: true },
    { id: "to-be-settled", name: "TO BE SETTLED" },
    { id: "services", name: "SERVICES" },
    { id: "extras", name: "EXTRAS" },
    // Disabled sections from products to timepass
    // { id: "products", name: "PRODUCTS" },
    // { id: "own-amount", name: "OWN AMOUNT" },
    // { id: "gift-cards", name: "GIFT CARDS" },
    // { id: "packages", name: "PACKAGES" },
    // { id: "time-passes", name: "TIME PASSES" },
  ];
  const [basket, setBasket] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState("Days");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedQuickSaleItems, setSelectedQuickSaleItems] = useState<string[]>([]);
  const [quickSaleItems, setQuickSaleItems] = useState<QuickSaleItem[]>([]);
  const [loadingQuickSale, setLoadingQuickSale] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedAppointmentStaffId, setSelectedAppointmentStaffId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [addonSearchQuery, setAddonSearchQuery] = useState("");

  // Load quick sale items from API on mount
  useEffect(() => {
    const loadQuickSaleItems = async () => {
      if (!businessId || servicesLoading) return;
      
      try {
        setLoadingQuickSale(true);
        const items = await quickSaleService.getQuickSaleItems(businessId);
        // Convert API items to display format
        const displayItems = items.map(item => {
          const service = services.find(s => s.id === item.serviceId);
          const converted = {
            id: item.serviceId.toString(),
            name: item.serviceName || service?.name || 'Unknown',
            duration: item.durationMinutes 
              ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}min`.replace(/^0h /, '').replace(/ 0min$/, 'min')
              : 'N/A',
            price: item.price 
              ? `${item.price.toFixed(2)} zł`
              : item.priceType === 'FROM' 
                ? `From ${item.price?.toFixed(2) || '0.00'} zł`
                : 'Price on request',
            color: item.color || 'gray',
            type: (item.serviceType === 'COMBO' ? 'combo' : 'service') as 'service' | 'combo',
            serviceId: item.serviceId,
          };
          return converted;
        });
        setQuickSaleItems(displayItems);
      } catch (error) {
        // Silently handle error - user hasn't configured quick sale items yet
        // If no items found, that's okay - user hasn't configured yet
        setQuickSaleItems([]);
      } finally {
        setLoadingQuickSale(false);
      }
    };

    loadQuickSaleItems();
  }, [businessId, services, servicesLoading]);

  // Load today's appointments when "to-be-settled" category is active
  useEffect(() => {
    const loadTodayAppointments = async () => {
      if (!businessId || activeCategory !== "to-be-settled") return;
      
      try {
        setLoadingAppointments(true);
        const today = new Date();
        const appointments = await appointmentService.getAppointmentsByBusiness(businessId, today);
        
        // Enrich appointments with service names if missing
        const enrichedAppointments = appointments.map(apt => {
          if (!apt.serviceName && apt.serviceId) {
            const service = services.find(s => s.id === apt.serviceId);
            if (service) {
              return { ...apt, serviceName: service.name };
            }
          }
          return apt;
        });
        
        const unsettledAppointments = filterAndSortUnsettledAppointments(enrichedAppointments);
        setTodayAppointments(unsettledAppointments);
      } catch (error) {
        console.error('Failed to load today\'s appointments:', error);
        setTodayAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    loadTodayAppointments();
  }, [businessId, activeCategory, services]);

  // WebSocket subscription for real-time appointment updates
  useEffect(() => {
    if (!businessId || activeCategory !== "to-be-settled") return;

    // Connect to WebSocket if not already connected
    if (!websocketService.isConnected()) {
      websocketService.connect().catch((error) => {
        console.error('Failed to connect WebSocket:', error);
      });
    }

    // Subscribe to appointment updates
    const unsubscribe = websocketService.subscribeToAppointments(
      businessId,
      (appointment: Appointment) => {
        // Check if appointment is for today and matches criteria
        const today = format(new Date(), 'yyyy-MM-dd');
        const aptDate = format(new Date(appointment.appointmentDate), 'yyyy-MM-dd');
        
        if (aptDate === today) {
          setTodayAppointments((prevAppointments) => {
            // Enrich appointment with service name if missing
            let enrichedAppointment = appointment;
            if (!appointment.serviceName && appointment.serviceId) {
              const service = services.find(s => s.id === appointment.serviceId);
              if (service) {
                enrichedAppointment = { ...appointment, serviceName: service.name };
              }
            }
            
            // Check if appointment matches the unsettled criteria
            const isUnsettled = 
              enrichedAppointment.status !== 'CANCELLED' && 
              enrichedAppointment.status !== 'NO_SHOW' &&
              (enrichedAppointment.paymentStatus === 'PENDING' || enrichedAppointment.paymentStatus === 'PARTIALLY_REFUNDED');

            // Find if appointment already exists in the list
            const existingIndex = prevAppointments.findIndex(apt => apt.id === enrichedAppointment.id);

            if (isUnsettled) {
              // If it matches criteria, add or update it
              if (existingIndex >= 0) {
                // Update existing appointment
                const updated = [...prevAppointments];
                updated[existingIndex] = enrichedAppointment;
                return filterAndSortUnsettledAppointments(updated);
              } else {
                // Add new appointment
                return filterAndSortUnsettledAppointments([...prevAppointments, enrichedAppointment]);
              }
            } else {
              // If it no longer matches criteria, remove it
              if (existingIndex >= 0) {
                return prevAppointments.filter(apt => apt.id !== enrichedAppointment.id);
              }
            }

            return prevAppointments;
          });
        }
      }
    );

    // Cleanup subscription when category changes or component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [businessId, activeCategory]);

  // Load categories when services tab is active
  useEffect(() => {
    const loadCategories = async () => {
      if (!businessId || activeCategory !== "services") return;
      
      try {
        setLoadingCategories(true);
        const cats = await categoryService.getCategoriesByBusiness(businessId);
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [businessId, activeCategory]);

  // Load transactions when TRANSACTIONS tab is active
  useEffect(() => {
    const loadTransactions = async () => {
      if (!businessId || activeTab !== "TRANSACTIONS") return;
      
      try {
        setLoadingTransactions(true);
        
        // Calculate date range based on period filter
        let startDate: Date;
        let endDate: Date = new Date();
        
        if (periodFilter === "Days") {
          // Last 7 days
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        } else if (periodFilter === "Months") {
          // Last 30 days
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        } else {
          // Another period - use selected date range (for now, last 30 days)
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        }
        
        const sales = await saleService.getSalesByDateRange(businessId, startDate, endDate);
        
        // Convert sales to transactions
        const convertedTransactions: Transaction[] = sales.map((sale) => {
          const saleDate = new Date(sale.saleDate);
          const saleTime = sale.saleTime || '00:00';
          const [hours, minutes] = saleTime.split(':');
          const timeStr = `${hours}:${minutes}`;
          
          // Format date
          const dateStr = format(saleDate, 'd MMM, yyyy');
          
          // Calculate tax (assuming 23% VAT for Poland)
          const taxRate = 23;
          const netWorth = sale.total / (1 + taxRate / 100);
          const taxAmount = sale.total - netWorth;
          
          // Format payment method - for split payments, show cash and card amounts
          let paymentMethodDisplay: string;
          if (sale.paymentMethod === 'SPLIT' && sale.splitCashAmount && sale.splitCardAmount) {
            paymentMethodDisplay = `Cash: ${sale.splitCashAmount.toFixed(2)} zł, Card: ${sale.splitCardAmount.toFixed(2)} zł`;
          } else {
            const paymentMethodMap: Record<string, string> = {
              'CASH': 'Cash',
              'CARD_TERMINAL': 'Card',
              'CHECK': 'Check',
              'SPLIT': 'Split payment',
              'MEMBERSHIP': 'Membership',
              'GIFT_CARD': 'Gift card',
              'PACKAGE': 'Package',
            };
            paymentMethodDisplay = paymentMethodMap[sale.paymentMethod] || sale.paymentMethod;
          }
          
          return {
            id: sale.id.toString(),
            time: timeStr,
            date: dateStr,
            description: sale.notes || '',
            status: sale.status === 'COMPLETED' ? 'PAID' : sale.status,
            amount: `${sale.total.toFixed(2)} zł`,
            paymentMethod: paymentMethodDisplay,
            splitCashAmount: sale.splitCashAmount,
            splitCardAmount: sale.splitCardAmount,
            billNumber: sale.billNumber,
            billId: sale.billId,
            clientName: sale.clientName || 'Walk In Client',
            address: sale.clientEmail || '',
            items: sale.items.map(item => ({
              name: item.serviceName,
              duration: item.duration,
              quantity: item.quantity,
              price: `${(item.unitPrice * item.quantity).toFixed(2)} zł`,
            })),
            staffName: sale.staffName,
            tax: {
              rate: `${taxRate}%`,
              netWorth: `${netWorth.toFixed(2)} zł`,
              taxAmount: `${taxAmount.toFixed(2)} zł`,
              grossValue: `${sale.total.toFixed(2)} zł`,
            },
            addition: `${sale.subtotal.toFixed(2)} zł`,
            discount: sale.discountAmount > 0 
              ? `${sale.discountAmount.toFixed(2)} zł` 
              : sale.discountPercent > 0 
                ? `${sale.discountPercent.toFixed(0)}%`
                : '0.00 zł',
            tip: sale.tipAmount > 0 
              ? `${sale.tipAmount.toFixed(2)} zł` 
              : sale.tipPercent > 0 
                ? `${sale.tipPercent.toFixed(0)}%`
                : '0.00 zł',
            total: `${sale.total.toFixed(2)} zł`,
            paidDate: format(new Date(`${sale.saleDate}T${saleTime}`), 'dd/MM/yyyy, HH:mm'),
            isoDate: new Date(`${sale.saleDate}T${saleTime}`).toISOString(),
            sale: sale,
          };
        });

        // Sort by date and time (newest first) using ISO string for cross-browser reliability
        convertedTransactions.sort((a, b) => {
          return new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
        });
        
        setTransactions(convertedTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [businessId, activeTab, periodFilter]);

  // Group services by category and filter by search
  const groupedServices = useMemo(() => {
    if (!services.length) return {};
    
    // Filter services by search query
    const filtered = services.filter(service => {
      if (!serviceSearchQuery) return true;
      const query = serviceSearchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(query) ||
        service.categoryName?.toLowerCase().includes(query) ||
        (service.serviceType === 'COMBO' && 'combo'.includes(query))
      );
    });

    // Group by category
    const grouped: Record<string, Service[]> = {};
    const uncategorized: Service[] = [];

    filtered.forEach(service => {
      if (service.categoryName) {
        if (!grouped[service.categoryName]) {
          grouped[service.categoryName] = [];
        }
        grouped[service.categoryName].push(service);
      } else {
        uncategorized.push(service);
      }
    });

    // Add uncategorized if any
    if (uncategorized.length > 0) {
      grouped['Uncategorized'] = uncategorized;
    }

    return grouped;
  }, [services, serviceSearchQuery]);

  // Get available services and combos for quick sale
  const availableItems = useMemo(() => {
    return services
      .filter(s => s.isActive && s.isVisible)
      .map(service => ({
        id: service.id.toString(),
        name: service.name,
        duration: service.durationMinutes 
          ? `${Math.floor(service.durationMinutes / 60)}h ${service.durationMinutes % 60}min`.replace(/^0h /, '').replace(/ 0min$/, 'min')
          : 'N/A',
        price: service.price 
          ? `${service.price.toFixed(2)} zł`
          : service.priceType === 'FROM' 
            ? `From ${service.price?.toFixed(2) || '0.00'} zł`
            : 'Price on request',
        color: service.color || 'gray',
        type: (service.serviceType === 'COMBO' ? 'combo' : 'service') as 'service' | 'combo',
        serviceId: service.id,
      }));
  }, [services]);

  // Initialize selected items when opening edit dialog
  useEffect(() => {
    if (showEditDialog) {
      setSelectedQuickSaleItems(quickSaleItems.map(item => item.id));
    }
  }, [showEditDialog, quickSaleItems]);

  // Save quick sale configuration
  const saveQuickSaleConfig = async () => {
    try {
      const serviceIds = selectedQuickSaleItems.map(id => parseInt(id));
      const savedItems = await quickSaleService.updateQuickSaleItems(businessId, serviceIds);
      
      // Convert API items to display format
      const displayItems = savedItems.map(item => {
        const service = services.find(s => s.id === item.serviceId);
        return {
          id: item.serviceId.toString(),
          name: item.serviceName || service?.name || 'Unknown',
          duration: item.durationMinutes 
            ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}min`.replace(/^0h /, '').replace(/ 0min$/, 'min')
            : 'N/A',
          price: item.price 
            ? `${item.price.toFixed(2)} zł`
            : item.priceType === 'FROM' 
              ? `From ${item.price?.toFixed(2) || '0.00'} zł`
              : 'Price on request',
          color: item.color || 'gray',
          type: (item.serviceType === 'COMBO' ? 'combo' : 'service') as 'service' | 'combo',
          serviceId: item.serviceId,
        };
      });
      
      setQuickSaleItems(displayItems);
      setShowEditDialog(false);
      setIsEditMode(false);
      toast.success('Quick sale items updated successfully');
    } catch (error) {
      toast.error('Failed to save quick sale items. Please try again.');
    }
  };

  // Get items to display (use saved quick sale items or fallback to first 6 available)
  const displayItems = useMemo(() => {
    if (quickSaleItems.length > 0) {
      return quickSaleItems;
    }
    // Fallback: show first 6 available items
    return availableItems.slice(0, 6);
  }, [quickSaleItems, availableItems]);

  const addToBasket = (item: QuickSaleItem) => {
    setBasket([...basket, { ...item, basketId: Date.now().toString() }]);
  };

  const removeFromBasket = (basketId: string) => {
    setBasket(basket.filter((item) => item.basketId !== basketId));
  };

  const clearBasket = () => {
    setBasket([]);
    setSelectedClient(null);
  };

  const calculateTotal = () => {
    return basket.reduce((sum, item) => {
      const raw = parseFloat(String(item.price ?? "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      const itemPrice = isNaN(raw) ? 0 : raw;
      return sum + itemPrice;
    }, 0);
  };

  const getColorClass = (color: string) => {
    // If color is a hex code, return empty string (we'll use inline style)
    if (color && color.startsWith('#')) {
      return "";
    }
    const colors: Record<string, string> = {
      pink: "border-l-pink-500",
      blue: "border-l-blue-500",
      green: "border-l-green-500",
    };
    return colors[color] || "border-l-gray-500";
  };

  // If payment method page is shown, render it instead
  if (showPaymentMethod) {
    const orderItems = basket.map(item => {
      const raw = parseFloat(String(item.price ?? "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      return {
        id: item.basketId,
        name: item.name,
        quantity: 1,
        price: isNaN(raw) ? 0 : raw,
        duration: item.duration,
      };
    });

    return (
      <PaymentMethodPage
        orderItems={orderItems}
        subtotal={calculateTotal()}
        selectedClient={selectedClient ? { id: "", name: selectedClient } : null}
        selectedStaff={staff?.find(s => s.id === selectedAppointmentStaffId) ?? (staff && staff.length > 0 ? staff[0] : null)}
        onConfirm={async (paymentData) => {
          try {
            // Map payment method from PaymentMethodPage format to backend format
            const paymentMethodMap: Record<string, 'CASH' | 'CARD_TERMINAL' | 'CHECK' | 'SPLIT' | 'MEMBERSHIP' | 'GIFT_CARD' | 'PACKAGE'> = {
              'cash': 'CASH',
              'card-terminal': 'CARD_TERMINAL',
              'check': 'CHECK',
              'split': 'SPLIT',
              'membership': 'MEMBERSHIP',
              'gift-card': 'GIFT_CARD',
              'package': 'PACKAGE',
            };

            // Convert basket items to sale items
            const saleItems = basket.map(item => {
              const rawPrice = parseFloat(String(item.price ?? "0").replace(/[^0-9.,]/g, "").replace(",", "."));
              const price = isNaN(rawPrice) ? 0 : rawPrice;
              return {
                serviceId: item.serviceId,
                serviceName: item.name,
                serviceType: item.type === 'combo' ? 'COMBO' : 'SERVICE',
                quantity: 1,
                unitPrice: price,
                duration: item.duration,
              };
            });

            // Calculate subtotal
            const subtotal = calculateTotal();

            // Get selected staff ID — prefer the appointment's staff, fall back to first in list
            const staffId = selectedAppointmentStaffId ?? (staff && staff.length > 0 ? staff[0].id : undefined);

            // Create payment confirmation request
            const confirmationRequest: PaymentConfirmationRequest = {
              businessId: businessId!,
              staffId: staffId,
              clientName: selectedClient || undefined,
              items: saleItems,
              discountAmount: 0,
              discountPercent: 0,
              tipAmount: paymentData.tip,
              tipPercent: paymentData.tipPercent,
              paymentMethod: paymentMethodMap[paymentData.paymentMethod] || 'CASH',
              paymentAmount: paymentData.amount,
              splitCashAmount: paymentData.splitCashAmount,
              splitCardAmount: paymentData.splitCardAmount,
              appointmentId: selectedAppointmentId || undefined,
            };

            // Confirm payment (creates sale, calculates commissions, updates appointment)
            const response = await paymentConfirmationService.confirmPayment(confirmationRequest);

            // Success
            toast.success('Payment processed successfully');
            setShowPaymentMethod(false);
            setBasket([]);
            setSelectedClient(null);
            setSelectedAppointmentId(null);
            setSelectedAppointmentStaffId(null);
          } catch (error: any) {
            console.error('Failed to process payment:', error);
            toast.error(error.message || 'Failed to process payment. Please try again.');
          }
        }}
        onCancel={() => setShowPaymentMethod(false)}
      />
    );
  }

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col bg-white" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab("NEW SALES")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "NEW SALES"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            NEW SALES
          </button>
          <button
            onClick={() => setActiveTab("TRANSACTIONS")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "TRANSACTIONS"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            TRANSACTIONS
          </button>
          {/* Invoices section disabled */}
          {/* <button
            onClick={() => setActiveTab("INVOICES")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "INVOICES"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            INVOICES
          </button> */}
        </div>

        {/* Main Content Area */}
        {activeTab === "NEW SALES" ? (
          <div className="flex flex-1" style={{ minHeight: 0, width: '100%' }}>
            {/* Left Sidebar */}
            <div 
              className="border-r-2 border-gray-300 bg-white overflow-y-auto"
              style={{ 
                width: '256px',
                minWidth: '256px',
                maxWidth: '256px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <div className="p-4 space-y-1">
                {sidebarCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors relative ${
                      activeCategory === category.id
                        ? "text-gray-900 bg-gray-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {activeCategory === category.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900" />
                    )}
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content - Category Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeCategory === "quick-sale" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">QUICK SALE</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
            </Button>
              </div>
              {servicesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">Loading services...</p>
                </div>
              ) : displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-gray-900 font-medium mb-2">No quick sale items configured</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Click "Edit" to select services and combos for quick sale
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Configure Quick Sale
            </Button>
          </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToBasket(item)}
                      className={`
                        bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                        hover:shadow-md transition-all border-l-4
                        ${getColorClass(item.color)}
                      `}
                      style={item.color && item.color.startsWith('#') ? { borderLeftColor: item.color } : undefined}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 flex-1">{item.name}</h3>
                        {item.type === 'combo' && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            COMBO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{item.duration}</p>
                      <p className="text-base font-semibold text-gray-900">{item.price}</p>
                    </div>
                  ))}
                </div>
              )}
                </>
              )}

              {activeCategory === "services" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">SERVICES</h2>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search services and combos..."
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                  </div>

                  {servicesLoading || loadingCategories ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Loading services...</p>
                    </div>
                  ) : Object.keys(groupedServices).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <p className="text-gray-900 font-medium mb-2">
                        {serviceSearchQuery ? 'No services found' : 'No services available'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {serviceSearchQuery 
                          ? 'Try a different search term'
                          : 'Create services and combos to see them here'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedServices).map(([categoryName, categoryServices]) => (
                        <div key={categoryName}>
                          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                            {categoryName}
                          </h3>
                          <div className="grid grid-cols-3 gap-4">
                            {categoryServices
                              .filter(s => s.isActive && s.isVisible)
                              .map((service) => {
                                const serviceItem: QuickSaleItem = {
                                  id: service.id.toString(),
                                  name: service.name,
                                  duration: service.durationMinutes 
                                    ? `${Math.floor(service.durationMinutes / 60)}h ${service.durationMinutes % 60}min`.replace(/^0h /, '').replace(/ 0min$/, 'min')
                                    : 'N/A',
                                  price: service.price 
                                    ? `${service.price.toFixed(2)} zł`
                                    : service.priceType === 'FROM' 
                                      ? `From ${service.price?.toFixed(2) || '0.00'} zł`
                                      : 'Price on request',
                                  color: service.color || 'gray',
                                  type: (service.serviceType === 'COMBO' ? 'combo' : 'service') as 'service' | 'combo',
                                  serviceId: service.id,
                                };
                                
            return (
                                  <div
                                    key={service.id}
                                    onClick={() => addToBasket(serviceItem)}
                                    className={`
                                      bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                                      hover:shadow-md transition-all border-l-4
                                      ${getColorClass(service.color || 'gray')}
                                    `}
                                    style={service.color && service.color.startsWith('#') ? { borderLeftColor: service.color } : undefined}
                                  >
                                    <div className="flex items-start justify-between mb-1">
                                      <h3 className="font-medium text-gray-900 flex-1">{service.name}</h3>
                                      {service.serviceType === 'COMBO' && (
                                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                          COMBO
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{serviceItem.duration}</p>
                                    <p className="text-base font-semibold text-gray-900">{serviceItem.price}</p>
                                  </div>
            );
          })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeCategory === "extras" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">EXTRAS</h2>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search addons..."
                        value={addonSearchQuery}
                        onChange={(e) => setAddonSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                  </div>

                  {addonsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Loading addons...</p>
                    </div>
                  ) : addons.filter(a => {
                      if (!a.isActive || !a.isVisible) return false;
                      if (!addonSearchQuery) return true;
                      const query = addonSearchQuery.toLowerCase();
                      return a.name.toLowerCase().includes(query) || 
                             a.description?.toLowerCase().includes(query);
                    }).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <p className="text-gray-900 font-medium mb-2">
                        {addonSearchQuery ? 'No addons found' : 'No addons available'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {addonSearchQuery 
                          ? 'Try a different search term'
                          : 'Create addons to see them here'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {addons
                        .filter(addon => {
                          if (!addon.isActive || !addon.isVisible) return false;
                          if (!addonSearchQuery) return true;
                          const query = addonSearchQuery.toLowerCase();
                          return addon.name.toLowerCase().includes(query) || 
                                 addon.description?.toLowerCase().includes(query);
                        })
                        .map((addon) => {
                          const addonItem: QuickSaleItem = {
                            id: addon.id.toString(),
                            name: addon.name,
                            duration: 'N/A',
                            price: addon.price 
                              ? `${addon.price.toFixed(2)} zł`
                              : addon.priceType === 'FROM' 
                                ? `From ${addon.price?.toFixed(2) || '0.00'} zł`
                                : 'Price on request',
                            color: addon.color || 'gray',
                            type: 'service',
                            serviceId: addon.id,
                          };
                          
                          return (
                            <div
                              key={addon.id}
                              onClick={() => addToBasket(addonItem)}
                              className={`
                                bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                                hover:shadow-md transition-all border-l-4
                                ${getColorClass(addon.color || 'gray')}
                              `}
                              style={addon.color && addon.color.startsWith('#') ? { borderLeftColor: addon.color } : undefined}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-medium text-gray-900 flex-1">{addon.name}</h3>
                              </div>
                              {addon.description && (
                                <p className="text-sm text-gray-500 mb-2">{addon.description}</p>
                              )}
                              <p className="text-base font-semibold text-gray-900">{addonItem.price}</p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}

              {activeCategory === "to-be-settled" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">TO BE SETTLED</h2>
                    <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  {loadingAppointments ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Loading appointments...</p>
                    </div>
                  ) : todayAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <p className="text-gray-900 font-medium mb-2">No appointments for today</p>
                      <p className="text-sm text-gray-500">
                        All appointments for today have been settled or there are no appointments scheduled.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {todayAppointments.map((appointment) => {
                        // Find staff details for this appointment
                        const staffMember = staff.find(s => s.id === appointment.staffId);
                        const staffInitials = staffMember?.initials || 
                          (staffMember?.name ? staffMember.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                          (appointment.staffName ? appointment.staffName.split(' ').map(n => n[0]).join('').toUpperCase() : ''));
                        const staffAvatarUrl = staffMember?.avatarUrl;
                        const staffName = staffMember?.name || appointment.staffName || 'Staff';
                        const staffPosition = staffMember?.position;

                        // Avatar colors based on staff ID
                        const avatarColors = [
                          "from-rose-400 to-pink-500",
                          "from-amber-400 to-orange-500", 
                          "from-emerald-400 to-teal-500",
                          "from-blue-400 to-indigo-500",
                          "from-violet-400 to-purple-500",
                          "from-cyan-400 to-sky-500",
                        ];
                        const colorIndex = (appointment.staffId || 0) % avatarColors.length;
                        const gradientClass = avatarColors[colorIndex];

                        return (
                          <div
                            key={appointment.id}
                            className="bg-white border-l-4 rounded-r-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            style={{ borderLeftColor: appointment.color || '#9ca3af' }}
                            onClick={() => {
                              // Add appointment service to basket
                              const serviceItem: QuickSaleItem = {
                                id: appointment.serviceId.toString(),
                                name: appointment.serviceName || 'Service',
                                duration: `${appointment.startTime} - ${appointment.endTime}`,
                                price: appointment.price ? `${appointment.price.toFixed(2)} zł` : 'Price on request',
                                color: appointment.color || 'gray',
                                type: 'service',
                                serviceId: appointment.serviceId,
                              };
                              addToBasket(serviceItem);
                              setSelectedClient(appointment.clientName || null);
                              setSelectedAppointmentId(appointment.id);
                              setSelectedAppointmentStaffId(appointment.staffId || null);
                            }}
                          >
                            <div className="p-3.5">
                              <div className="flex items-start justify-between gap-4">
                                {/* Left: Time and Main Info */}
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {/* Time Badge - More Friendly */}
                                  <div className="flex-shrink-0">
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[60px]">
                                      <div className="text-lg font-bold text-gray-900 leading-none">
                                        {appointment.startTime}
                                      </div>
                                      <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                        {(() => {
                                          const [hours, minutes] = appointment.startTime.split(':').map(Number);
                                          const hour12 = hours % 12 || 12;
                                          const ampm = hours >= 12 ? 'PM' : 'AM';
                                          return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Client and Service Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="mb-1">
                                      <h3 className="text-base font-semibold text-gray-900 truncate">
                                        {appointment.clientName || 'Walk In Client'}
                                      </h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span className="truncate font-medium">
                                        {appointment.serviceName || (() => {
                                          const service = services.find(s => s.id === appointment.serviceId);
                                          return service?.name || 'Service';
                                        })()}
                                      </span>
                                      {staffName && (
                                        <>
                                          <span className="text-gray-300">•</span>
                                          <span className="text-gray-700 font-medium flex-shrink-0">
                                            Staff: {staffName}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Right: Payment Status and Price */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                                    appointment.paymentStatus === 'PAID' 
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : appointment.paymentStatus === 'PENDING'
                                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                                  }`}>
                                    {appointment.paymentStatus}
                                  </span>
                                  {appointment.price && (
                                    <div className="text-right">
                                      <div className="text-base font-bold text-gray-900">
                                        {appointment.price.toFixed(2)} zł
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Sidebar - Basket */}
            <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
              {/* Client Selection */}
              <div className="p-4 border-b border-gray-200">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="flex items-center gap-3">
                    <User size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {selectedClient || "Select a client or leave blank"}
                    </span>
                  </div>
                  <Plus size={20} className="text-gray-400" />
                </div>
              </div>

              {/* Basket Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {basket.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-gray-900 font-medium mb-2">The basket is empty</p>
                    <p className="text-sm text-gray-500">
                      Select the items you want to add to your cart.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {basket.map((item) => (
                      <div
                        key={item.basketId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.price}</p>
                        </div>
                        <button
                          onClick={() => removeFromBasket(item.basketId)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Basket Footer */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={clearBasket}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={basket.length === 0}
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">TOGETHER</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {calculateTotal().toFixed(2)} zł
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-gray-200 text-gray-900 hover:bg-gray-300 font-medium"
                  disabled={basket.length === 0}
                  onClick={() => setShowPaymentMethod(true)}
                >
                  SELECT PAYMENT METHOD
            </Button>
              </div>
            </div>
          </div>
        ) : activeTab === "TRANSACTIONS" ? (
          <div className="flex flex-1 overflow-hidden bg-gray-50">
            {/* Left Panel - Filters and Summary */}
            <div className="w-96 border-r border-gray-200 bg-white">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button className="text-gray-600 hover:text-gray-900" onClick={() => setActiveTab("NEW SALES")}>
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">All transactions</h2>
              </div>

              {/* Period Filter Tabs */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  {["Days", "Months", "Another period"].map((period) => (
                    <button
                      key={period}
                      onClick={() => setPeriodFilter(period)}
                      className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                        periodFilter === period
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search for a customer or transaction ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
        </div>

              {/* Date Summary */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">
                    {format(selectedDate, 'yyyy-MM-dd')}
                  </span>
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Show list &gt;
                  </button>
                </div>
                {loadingTransactions ? (
                  <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4">
                      {(() => {
                        // Calculate payment summary by method
                        // For split payments, count cash and card separately
                        const methodTotals: Record<string, number> = {};
                        transactions.forEach(t => {
                          if (t.splitCashAmount && t.splitCardAmount) {
                            // Split payment - add to both cash and card
                            methodTotals['Cash'] = (methodTotals['Cash'] || 0) + t.splitCashAmount;
                            methodTotals['Card'] = (methodTotals['Card'] || 0) + t.splitCardAmount;
                          } else {
                            // Regular payment - add to the method
                            const method = t.paymentMethod.split(':')[0].trim(); // Extract method name if it contains ":"
                            const amount = parseFloat(t.amount.replace(' zł', '').replace(',', '.'));
                            methodTotals[method] = (methodTotals[method] || 0) + amount;
                          }
                        });
                        
                        return Object.entries(methodTotals).map(([method, amount]) => (
                          <div key={method} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{method}</span>
                            <span className="font-medium text-gray-900">{amount.toFixed(2)} zł</span>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Together</span>
                        <span className="text-lg font-bold text-gray-900">
                          {transactions.reduce((sum, t) => {
                            const amount = parseFloat(t.amount.replace(' zł', '').replace(',', '.'));
                            return sum + amount;
                          }, 0).toFixed(2)} zł
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel - Transaction List */}
            <div className="flex-1 overflow-y-auto bg-white p-6">
              {loadingTransactions ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-gray-900 font-medium mb-2">No transactions found</p>
                  <p className="text-sm text-gray-500">
                    No sales have been recorded for the selected period.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions
                    .filter(t => !searchQuery ||
                      t.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.id?.toString().includes(searchQuery))
                    .map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Receipt size={20} className="text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {transaction.time}
                        </span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-500">{transaction.date}</span>
                        {transaction.description && (
                          <>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-600">{transaction.description}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-base font-semibold text-gray-900">
                        {transaction.amount}
                      </span>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
              <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={() => setSelectedTransaction(null)}>
                <div className="w-[500px] h-full bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-600 hover:text-gray-900">
                        <Send size={20} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="px-6 py-6">
                    {/* Status Badge */}
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        {selectedTransaction.status}
                      </span>
                    </div>

                    {/* Bill Information */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            Bill {selectedTransaction.billNumber} | ID {selectedTransaction.billId}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{selectedTransaction.date}</span>
                      </div>
                    </div>

                    {/* Client/Studio Details */}
                    <div className="mb-6">
                      <p className="text-base font-medium text-gray-900 mb-1">
                        {selectedTransaction.clientName}
                      </p>
                      <p className="text-sm text-gray-600">{selectedTransaction.address}</p>
                    </div>

                    {/* Service Details */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-900">Position</span>
                        <span className="text-sm font-medium text-gray-900">Sum</span>
                      </div>
                      <div className="space-y-2">
                        {selectedTransaction.items.map((item, index) => (
                          <div key={index} className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.name} {item.duration && `(${item.duration})`}
                              </p>
                              {selectedTransaction.staffName && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Staff: {selectedTransaction.staffName}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm text-gray-600">x{item.quantity}</p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {item.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tax Breakdown Table */}
                    <div className="mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 text-gray-600 font-medium">Tax</th>
                            <th className="text-right py-2 text-gray-600 font-medium">Net worth</th>
                            <th className="text-right py-2 text-gray-600 font-medium">Tax amount</th>
                            <th className="text-right py-2 text-gray-600 font-medium">Gross value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 text-gray-900">{selectedTransaction.tax.rate}</td>
                            <td className="py-2 text-right text-gray-900">{selectedTransaction.tax.netWorth}</td>
                            <td className="py-2 text-right text-gray-900">{selectedTransaction.tax.taxAmount}</td>
                            <td className="py-2 text-right text-gray-900 font-medium">{selectedTransaction.tax.grossValue}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Summary of Charges */}
                    <div className="mb-6 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Addition</span>
                        <span className="text-gray-900 font-medium">{selectedTransaction.addition}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Rabat</span>
                        <span className="text-gray-900 font-medium">{selectedTransaction.discount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Tip</span>
                        <span className="text-gray-900 font-medium">{selectedTransaction.tip}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-base font-medium text-gray-900">Together</span>
                        <span className="text-base font-bold text-gray-900">{selectedTransaction.total}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          {selectedTransaction.splitCashAmount && selectedTransaction.splitCardAmount ? (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                Paid • Split payment • {selectedTransaction.paidDate}
                              </p>
                              <div className="text-sm text-gray-700">
                                <span>Cash: {selectedTransaction.splitCashAmount.toFixed(2)} zł</span>
                                <span className="mx-2">•</span>
                                <span>Card: {selectedTransaction.splitCardAmount.toFixed(2)} zł</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              Paid • {selectedTransaction.paymentMethod} • {selectedTransaction.paidDate}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{selectedTransaction.amount}</span>
                      </div>
                    </div>

                    {/* Final Paid Amount */}
                    <div className="mb-6">
                      <p className="text-lg font-bold text-gray-900">
                        Paid {selectedTransaction.amount}
                      </p>
                    </div>

                    {/* Perforated Bottom Edge */}
                    <div className="relative mt-8">
                      <div 
                        className="h-6 relative"
                        style={{
                          backgroundImage: `repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 2px,
                            #d1d5db 2px,
                            #d1d5db 4px
                          )`,
                          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 98% 50%, 98% 100%, 2% 100%, 2% 50%, 0 50%)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Edit Quick Sale Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Quick Sale Items</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Select services and combos to display in the quick sale section. These items will be easily accessible for fast checkout.
              </p>
              
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">Loading services...</p>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-gray-900 font-medium mb-2">No services available</p>
                  <p className="text-sm text-gray-500">
                    Create services and combos first to add them to quick sale
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      className={`
                        flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedQuickSaleItems.includes(item.id)
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => {
                        setSelectedQuickSaleItems(prev => 
                          prev.includes(item.id)
                            ? prev.filter(id => id !== item.id)
                            : [...prev, item.id]
                        );
                      }}
                    >
                      <Checkbox
                        checked={selectedQuickSaleItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedQuickSaleItems(prev => [...prev, item.id]);
                          } else {
                            setSelectedQuickSaleItems(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {item.type === 'combo' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              COMBO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-500">{item.duration}</p>
                          <p className="text-sm font-medium text-gray-900">{item.price}</p>
                        </div>
                      </div>
                      <div 
                        className={`w-4 h-4 rounded border-l-4 ${getColorClass(item.color)}`}
                        style={{ borderLeftColor: item.color !== 'gray' ? undefined : '#6b7280' }}
                      />
                </div>
              ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedQuickSaleItems(quickSaleItems.map(item => item.id));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveQuickSaleConfig}
                  disabled={selectedQuickSaleItems.length === 0}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
