import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Check, X, User, Plus, Trash2, Pencil, Hand, 
  CreditCard, FileText, Split, UserCircle, Gift, Package, 
  MoreHorizontal, Share2, Percent, DollarSign
} from "lucide-react";

interface PaymentMethodPageProps {
  orderItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    duration?: string;
  }>;
  subtotal?: number;
  selectedClient?: { id: string; name: string; avatar?: string } | null;
  selectedStaff?: { id: number; name: string; avatarUrl?: string; position?: string } | null;
  onConfirm?: (paymentData: {
    tip: number;
    tipPercent: number;
    paymentMethod: string;
    amount: number;
    change: number;
    splitCashAmount?: number;
    splitCardAmount?: number;
  }) => void;
  onCancel?: () => void;
}

export default function PaymentMethodPage({ 
  orderItems = [],
  subtotal = 80.00,
  selectedClient: propSelectedClient = null,
  selectedStaff: propSelectedStaff = null,
  onConfirm,
  onCancel 
}: PaymentMethodPageProps) {
  const navigate = useNavigate();
  const [selectedTip, setSelectedTip] = useState<{ amount: number; percent: number } | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [showCustomTipDialog, setShowCustomTipDialog] = useState(false);
  const [customTipType, setCustomTipType] = useState<"percentage" | "fixed">("percentage");
  const [customTipValue, setCustomTipValue] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(subtotal);
  const [showPaymentAmountDialog, setShowPaymentAmountDialog] = useState(false);
  const [tempPaymentAmount, setTempPaymentAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState("");
  const [splitCardAmount, setSplitCardAmount] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; avatar?: string } | null>(propSelectedClient);
  const [selectedStaff, setSelectedStaff] = useState<{ id: number; name: string; avatarUrl?: string; position?: string } | null>(propSelectedStaff);

  // Update selected client when prop changes
  useEffect(() => {
    setSelectedClient(propSelectedClient);
  }, [propSelectedClient]);

  // Update selected staff when prop changes
  useEffect(() => {
    setSelectedStaff(propSelectedStaff);
  }, [propSelectedStaff]);

  // Update payment amount when card is selected and total changes (due to discount or tip)
  useEffect(() => {
    if (selectedPaymentMethod === "card-terminal") {
      const currentTotal = subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0);
      setPaymentAmount(currentTotal);
    }
  }, [selectedPaymentMethod, subtotal, discountAmount, selectedTip, customTip]);

  const tipOptions = [
    { amount: 0, percent: 0, label: "No Tip" },
    { amount: subtotal * 0.05, percent: 5, label: "5%" },
    { amount: subtotal * 0.10, percent: 10, label: "10%" },
  ];

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: Hand },
    { id: "card-terminal", name: "Card", icon: CreditCard },
    { id: "split", name: "Split payment", icon: Split },
    // Disabled payment methods
    // { id: "check", name: "Check", icon: FileText },
    // { id: "membership", name: "Membership", icon: UserCircle },
    // { id: "gift-card", name: "Gift Card", icon: Gift },
    // { id: "package", name: "Package", icon: Package },
  ];

  const total = subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0);
  const change = paymentAmount > total ? paymentAmount - total : 0;

  const handleTipSelect = (tip: typeof tipOptions[0]) => {
    setSelectedTip({ amount: tip.amount, percent: tip.percent });
    setShowCustomTip(false);
    setCustomTip("");
    setPaymentAmount(subtotal + tip.amount);
  };

  const handleCustomTip = () => {
    setShowCustomTipDialog(true);
    setCustomTipValue("");
    setCustomTipType("percentage");
  };

  const handleCustomTipConfirm = () => {
    const value = parseFloat(customTipValue) || 0;
    let tipAmount = 0;
    let tipPercent = 0;

    if (customTipType === "percentage") {
      tipPercent = value;
      tipAmount = subtotal * (value / 100);
    } else {
      tipAmount = value;
      tipPercent = subtotal > 0 ? (value / subtotal) * 100 : 0;
    }

    setCustomTip(tipAmount.toString());
    setSelectedTip({ amount: tipAmount, percent: tipPercent });
    setShowCustomTip(true);
    setShowCustomTipDialog(false);
    setPaymentAmount(subtotal + tipAmount);
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    const tipAmount = parseFloat(value) || 0;
    setPaymentAmount(subtotal + tipAmount);
  };

  const handleDiscountConfirm = () => {
    const value = parseFloat(discountValue) || 0;
    let discount = 0;
    let discountPct = 0;

    if (discountType === "percentage") {
      discountPct = value;
      discount = subtotal * (value / 100);
    } else {
      discount = value;
      discountPct = subtotal > 0 ? (value / subtotal) * 100 : 0;
    }

    // Discount cannot exceed subtotal
    if (discount > subtotal + 0.01) {
      toast.error(`Discount (${discount.toFixed(2)}) cannot exceed subtotal (${subtotal.toFixed(2)})`);
      return;
    }

    setDiscountAmount(discount);
    setDiscountPercent(discountPct);
    setShowDiscountDialog(false);
    setDiscountValue("");
    
    // Update payment amount if card is selected (should equal total)
    if (selectedPaymentMethod === "card-terminal") {
      const newTotal = subtotal - discount + (selectedTip?.amount || parseFloat(customTip) || 0);
      setPaymentAmount(newTotal);
    }
  };

  const handleSplitConfirm = () => {
    const cashAmount = parseFloat(splitCashAmount) || 0;
    const cardAmount = parseFloat(splitCardAmount) || 0;
    const currentTotal = subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0);
    
    // Set payment amount to total (cash + card)
    setPaymentAmount(cashAmount + cardAmount);
    setShowSplitDialog(false);
  };

  const handleConfirm = () => {
    // Split payment must sum to total
    if (selectedPaymentMethod === "split") {
      const splitSum = (parseFloat(splitCashAmount) || 0) + (parseFloat(splitCardAmount) || 0);
      if (Math.abs(splitSum - total) > 0.01) {
        toast.error(`Split amounts (${splitSum.toFixed(2)}) must equal total (${total.toFixed(2)})`);
        return;
      }
    }

    if (onConfirm) {
      const paymentData: {
        tip: number;
        tipPercent: number;
        paymentMethod: string;
        amount: number;
        change: number;
        splitCashAmount?: number;
        splitCardAmount?: number;
      } = {
        tip: selectedTip?.amount || parseFloat(customTip) || 0,
        tipPercent: selectedTip?.percent || 0,
        paymentMethod: selectedPaymentMethod,
        amount: paymentAmount,
        change: paymentAmount - (subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0)),
      };

      // Add split amounts if payment method is split
      if (selectedPaymentMethod === "split") {
        paymentData.splitCashAmount = parseFloat(splitCashAmount) || 0;
        paymentData.splitCardAmount = parseFloat(splitCardAmount) || 0;
      }

      onConfirm(paymentData);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Panel - Payment Method & Tip */}
      <div className="w-1/2 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Payment Method & Tip</h1>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-9 px-4 text-red-600 border-red-200 hover:bg-red-50"
          >
            CANCEL SALE
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Tip Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-gray-900">Tip</Label>
              <Button aria-label="Share" variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tipOptions.map((tip) => (
                <button
                  key={tip.percent}
                  onClick={() => handleTipSelect(tip)}
                  className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTip?.percent === tip.percent && !showCustomTip
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {selectedTip?.percent === tip.percent && !showCustomTip && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-900">{tip.label}</p>
                </button>
              ))}
              <button
                onClick={handleCustomTip}
                className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                  showCustomTip
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {showCustomTip && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MoreHorizontal className="h-5 w-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">Custom</p>
                </div>
              </button>
            </div>
            {showCustomTip && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Custom tip: {selectedTip ? (selectedTip.percent > 0 ? `${selectedTip.percent.toFixed(1)}%` : `${selectedTip.amount.toFixed(2)} zł`) : `${parseFloat(customTip).toFixed(2)} zł`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCustomTip(false);
                      setCustomTip("");
                      setSelectedTip(null);
                      setPaymentAmount(subtotal);
                    }}
                    className="h-7 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-gray-900">Payment method</Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
                      if (method.id === "cash") {
                        setTempPaymentAmount(paymentAmount.toFixed(2));
                        setShowPaymentAmountDialog(true);
                      } else if (method.id === "card-terminal") {
                        // For card, set payment amount to total (exact amount)
                        const currentTotal = subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0);
                        setPaymentAmount(currentTotal);
                      } else if (method.id === "split") {
                        // For split payment, open split dialog
                        const currentTotal = subtotal - discountAmount + (selectedTip?.amount || parseFloat(customTip) || 0);
                        setSplitCashAmount("");
                        setSplitCardAmount("");
                        setShowSplitDialog(true);
                      }
                    }}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPaymentMethod === method.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {selectedPaymentMethod === method.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    <Icon className="h-6 w-6 text-gray-700 mb-2" />
                    <p className="text-sm font-medium text-gray-900">{method.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Order Summary */}
      <div className="w-1/2 bg-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          
          {/* Client Selection */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-gray-400 transition-colors">
            <div className="flex items-center gap-3">
              {selectedClient ? (
                <>
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedClient.name}</p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </>
              ) : (
                <>
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Select client or leave empty for walk-in</span>
                </>
              )}
            </div>
            <Plus className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Item Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-gray-600 pb-2 border-b border-gray-200">
              <span>Item</span>
              <span>Amount</span>
            </div>
            {orderItems.length > 0 ? (
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.duration && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.duration}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.price.toFixed(2)} zł</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Pedicure klasyczny (1h 15m)</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">x1</span>
                  <span className="text-sm font-medium text-gray-900">100,00 zł</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Discount 20%</p>
              </div>
            )}
          </div>

          {/* Staff Info */}
          {selectedStaff && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {selectedStaff.avatarUrl ? (
                    <img
                      src={selectedStaff.avatarUrl}
                      alt={selectedStaff.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-gray-600">
                      {(selectedStaff.name || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedStaff.name}</p>
                  {selectedStaff.position && (
                    <p className="text-xs text-gray-500">{selectedStaff.position}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <User className="h-3.5 w-3.5 mr-1.5" />
                <Pencil className="h-3.5 w-3.5" />
                CHANGE
              </Button>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <span>👆</span>
              TAP ITEM TO CHANGE
            </p>
          </div>

          {/* Summary Breakdown */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{subtotal.toFixed(2)} zł</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Discount</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  aria-label="Edit discount"
                  className="h-5 w-5"
                  onClick={() => {
                    setDiscountValue("");
                    setDiscountType("percentage");
                    setShowDiscountDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3 text-gray-400" />
                </Button>
              </div>
              <span className="font-medium text-gray-900">
                {discountAmount > 0 ? `-${discountAmount.toFixed(2)} zł` : "0,00 zł"}
              </span>
            </div>
            {/* Usage section disabled */}
            {/* <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Usage</span>
              </div>
              <span className="font-medium text-gray-900">-</span>
            </div> */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span className="font-medium text-gray-900">
                {(selectedTip?.amount || parseFloat(customTip) || 0).toFixed(2)} zł
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-base font-bold text-gray-900">TOTAL</span>
              <span className="text-lg font-bold text-gray-900">{total.toFixed(2)} zł</span>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-medium text-gray-900">{total.toFixed(2)} zł</span>
            </div>
            {selectedPaymentMethod === "split" ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cash</span>
                  <span className="font-medium text-gray-900">{parseFloat(splitCashAmount) || 0} zł</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Card</span>
                  <span className="font-medium text-gray-900">{parseFloat(splitCardAmount) || 0} zł</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Customer gives</span>
                  <span className="font-medium text-gray-900">{paymentAmount.toFixed(2)} zł</span>
                </div>
                {change > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Return</span>
                    <span className="font-medium text-gray-900">{change.toFixed(2)} zł</span>
                  </div>
                )}
                {change < 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Due to</span>
                    <span className="font-medium text-red-600">{Math.abs(change).toFixed(2)} zł</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete"
            className="h-10 w-10 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-11 px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium"
          >
            CONFIRM AND PAY
          </Button>
        </div>
      </div>

      {/* Custom Tip Dialog */}
      <Dialog open={showCustomTipDialog} onOpenChange={setShowCustomTipDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Tip</DialogTitle>
            <DialogDescription>
              Choose whether to enter a percentage or fixed amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tip Type Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setCustomTipType("percentage")}
                className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                  customTipType === "percentage"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Percentage</span>
                </div>
                <p className="text-xs text-gray-500">Enter tip as percentage of subtotal</p>
              </button>
              <button
                onClick={() => setCustomTipType("fixed")}
                className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                  customTipType === "fixed"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Fixed Amount</span>
                </div>
                <p className="text-xs text-gray-500">Enter tip as fixed amount</p>
              </button>
            </div>

            {/* Tip Value Input */}
            <div className="space-y-2">
              <Label>
                {customTipType === "percentage" ? "Tip Percentage (%)" : "Tip Amount (zł)"}
              </Label>
              <div className="relative">
                {customTipType === "percentage" ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">%</span>
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">zł</span>
                )}
                <Input
                  type="number"
                  placeholder={customTipType === "percentage" ? "Enter percentage" : "Enter amount"}
                  value={customTipValue}
                  onChange={(e) => setCustomTipValue(e.target.value)}
                  className={customTipType === "percentage" ? "pr-10" : "pl-10"}
                  step={customTipType === "percentage" ? "0.1" : "0.01"}
                />
              </div>
              {customTipValue && (
                <p className="text-xs text-gray-500">
                  {customTipType === "percentage" ? (
                    <>Tip amount: {(subtotal * (parseFloat(customTipValue) || 0) / 100).toFixed(2)} zł</>
                  ) : (
                    <>Tip percentage: {subtotal > 0 ? ((parseFloat(customTipValue) || 0) / subtotal * 100).toFixed(2) : 0}%</>
                  )}
                </p>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomTipDialog(false);
                  setCustomTipValue("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomTipConfirm}
                disabled={!customTipValue || parseFloat(customTipValue) <= 0}
                className="bg-gray-900 hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Amount Dialog (for Cash) */}
      <Dialog open={showPaymentAmountDialog} onOpenChange={setShowPaymentAmountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Payment</DialogTitle>
            <DialogDescription>
              Enter the amount the customer is paying
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (zł)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">zł</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={tempPaymentAmount}
                  onChange={(e) => setTempPaymentAmount(e.target.value)}
                  className="h-12 pl-12 text-lg font-semibold"
                  step="0.01"
                  autoFocus
                />
              </div>
              {tempPaymentAmount && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="font-medium text-gray-900">{total.toFixed(2)} zł</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Customer gives</span>
                    <span className="font-medium text-gray-900">{parseFloat(tempPaymentAmount) || 0} zł</span>
                  </div>
                  {parseFloat(tempPaymentAmount) > total && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="text-gray-600">Return</span>
                      <span className="font-medium text-green-600">{(parseFloat(tempPaymentAmount) - total).toFixed(2)} zł</span>
                    </div>
                  )}
                  {parseFloat(tempPaymentAmount) < total && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="text-gray-600">Due to</span>
                      <span className="font-medium text-red-600">{(total - parseFloat(tempPaymentAmount)).toFixed(2)} zł</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentAmountDialog(false);
                  setTempPaymentAmount("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const amount = parseFloat(tempPaymentAmount) || total;
                  setPaymentAmount(amount);
                  setShowPaymentAmountDialog(false);
                  setTempPaymentAmount("");
                }}
                disabled={!tempPaymentAmount || parseFloat(tempPaymentAmount) < 0}
                className="bg-gray-900 hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Discount</DialogTitle>
            <DialogDescription>
              Choose whether to enter a percentage or fixed amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Discount Type Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setDiscountType("percentage")}
                className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                  discountType === "percentage"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Percentage</span>
                </div>
                <p className="text-xs text-gray-500">Enter discount as percentage of subtotal</p>
              </button>
              <button
                onClick={() => setDiscountType("fixed")}
                className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                  discountType === "fixed"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">Fixed Amount</span>
                </div>
                <p className="text-xs text-gray-500">Enter discount as fixed amount</p>
              </button>
            </div>

            {/* Discount Value Input */}
            <div className="space-y-2">
              <Label>
                {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (zł)"}
              </Label>
              <div className="relative">
                {discountType === "percentage" ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">%</span>
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">zł</span>
                )}
                <Input
                  type="number"
                  placeholder={discountType === "percentage" ? "Enter percentage" : "Enter amount"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={discountType === "percentage" ? "pr-10" : "pl-10"}
                  step={discountType === "percentage" ? "0.1" : "0.01"}
                />
              </div>
              {discountValue && (
                <p className="text-xs text-gray-500">
                  {discountType === "percentage" ? (
                    <>Discount amount: {(subtotal * (parseFloat(discountValue) || 0) / 100).toFixed(2)} zł</>
                  ) : (
                    <>Discount percentage: {subtotal > 0 ? ((parseFloat(discountValue) || 0) / subtotal * 100).toFixed(2) : 0}%</>
                  )}
                </p>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDiscountDialog(false);
                  setDiscountValue("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDiscountConfirm}
                disabled={!discountValue || parseFloat(discountValue) <= 0}
                className="bg-gray-900 hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Payment Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Split Payment</DialogTitle>
            <DialogDescription>
              Enter how much to pay with cash and how much with card
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-gray-900">{total.toFixed(2)} zł</span>
              </div>
            </div>

            {/* Cash Amount Input */}
            <div className="space-y-2">
              <Label>Cash Amount (zł)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">zł</span>
                <Input
                  type="number"
                  placeholder="Enter cash amount"
                  value={splitCashAmount}
                  onChange={(e) => {
                    setSplitCashAmount(e.target.value);
                    const cash = parseFloat(e.target.value) || 0;
                    const card = total - cash;
                    setSplitCardAmount(card > 0 ? card.toFixed(2) : "");
                  }}
                  className="h-12 pl-12 text-lg font-semibold"
                  step="0.01"
                />
              </div>
            </div>

            {/* Card Amount Input */}
            <div className="space-y-2">
              <Label>Card Amount (zł)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">zł</span>
                <Input
                  type="number"
                  placeholder="Enter card amount"
                  value={splitCardAmount}
                  onChange={(e) => {
                    setSplitCardAmount(e.target.value);
                    const card = parseFloat(e.target.value) || 0;
                    const cash = total - card;
                    setSplitCashAmount(cash > 0 ? cash.toFixed(2) : "");
                  }}
                  className="h-12 pl-12 text-lg font-semibold"
                  step="0.01"
                />
              </div>
            </div>

            {/* Split Summary */}
            {(splitCashAmount || splitCardAmount) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cash</span>
                  <span className="font-medium text-gray-900">{parseFloat(splitCashAmount) || 0} zł</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Card</span>
                  <span className="font-medium text-gray-900">{parseFloat(splitCardAmount) || 0} zł</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-semibold">Total</span>
                  <span className={`font-semibold ${
                    Math.abs((parseFloat(splitCashAmount) || 0) + (parseFloat(splitCardAmount) || 0) - total) < 0.01
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {((parseFloat(splitCashAmount) || 0) + (parseFloat(splitCardAmount) || 0)).toFixed(2)} zł
                  </span>
                </div>
                {Math.abs((parseFloat(splitCashAmount) || 0) + (parseFloat(splitCardAmount) || 0) - total) >= 0.01 && (
                  <p className="text-xs text-red-600 mt-1">
                    Amounts must equal {total.toFixed(2)} zł
                  </p>
                )}
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSplitDialog(false);
                  setSplitCashAmount("");
                  setSplitCardAmount("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSplitConfirm}
                disabled={
                  !splitCashAmount || 
                  !splitCardAmount || 
                  parseFloat(splitCashAmount) < 0 || 
                  parseFloat(splitCardAmount) < 0 ||
                  Math.abs((parseFloat(splitCashAmount) || 0) + (parseFloat(splitCardAmount) || 0) - total) >= 0.01
                }
                className="bg-gray-900 hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}











