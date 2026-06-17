import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, ArrowLeft, Check, ChevronRight, Sparkles, Scissors, 
  Heart, Stethoscope, MapPin, X, Plus, Minus, Eye, EyeOff, User, Bell, 
  DollarSign, Building2, Clock, Users, Settings, CheckCircle2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import AddressMapPicker from "@/components/AddressMapPicker";
import { authService } from "@/services/authService";
import { businessService } from "@/services/businessService";

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phonePrefix: string;
  password: string;
  passwordConfirmation: string;
  language: string;
  country: string;
  termsAccepted: boolean;
  marketing1: boolean;
  category: string;
  businessName: string;
  yourName: string;
  phoneVerified: boolean;
  weeklySchedule: string;
  workLocation: string;
  referralCode: string;
  address: string;
  buildingNumber: string;
  apartmentNumber: string;
  latitude: number | null;
  longitude: number | null;
  businessHours: {
    [key: string]: { enabled: boolean; hours: string };
  };
  teamSize: string;
  staffMembers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    type: string;
    duration: string;
    price: string;
    priceType: string;
  }>;
  helpOptions: string[];
  previousTools: string[];
  hasUsedTools: string;
  profileLiveDate: string;
}

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState<RegistrationData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phonePrefix: "+48",
    password: "",
    passwordConfirmation: "",
    language: "English",
    country: "Poland",
    termsAccepted: false,
    marketing1: false,
    category: "",
    businessName: "",
    yourName: "",
    phoneVerified: false,
    weeklySchedule: "",
    workLocation: "",
    referralCode: "",
    address: "",
    buildingNumber: "",
    apartmentNumber: "",
    businessHours: {
      monday: { enabled: true, hours: "10:00 - 19:00" },
      tuesday: { enabled: true, hours: "10:00 - 19:00" },
      wednesday: { enabled: true, hours: "10:00 - 19:00" },
      thursday: { enabled: true, hours: "10:00 - 19:00" },
      friday: { enabled: true, hours: "10:00 - 19:00" },
      saturday: { enabled: false, hours: "Closed" },
      sunday: { enabled: false, hours: "Closed" },
    },
    teamSize: "",
    staffMembers: [],
    services: [],
    helpOptions: [],
    previousTools: [],
    hasUsedTools: "",
    profileLiveDate: "3-days",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const searchAddressRef = useRef<NodeJS.Timeout | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [tempStartTime, setTempStartTime] = useState("10:00");
  const [tempEndTime, setTempEndTime] = useState("19:00");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newService, setNewService] = useState({ name: "", type: "", durationHours: "0", durationMinutes: "30", price: "", priceType: "Fixed" });
  const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "", phonePrefix: "+48", position: "" });

  const addressSuggestions = [
    { id: "1", street: "Karola Bunscha", city: "Kraków", country: "Poland" },
    { id: "2", street: "Karola Dickensa", city: "Warsaw", country: "Poland" },
    { id: "3", street: "Karola Taylora", city: "Warsaw", country: "Poland" },
  ];

  const featuredCategories = [
    { id: "nail-salons", name: "Nail salons", icon: Sparkles },
    { id: "brows-lashes", name: "Brows & Lashes", icon: Heart },
    { id: "skin-care", name: "Skin care", icon: Heart },
    { id: "hair-salons", name: "Hair salons", icon: Scissors },
    { id: "aesthetic-medicine", name: "Aesthetic medicine", icon: Stethoscope },
    { id: "barbers", name: "Barbers", icon: Scissors },
  ];

  const otherCategories = [
    "Automotive", "Dental", "Diet & training", "Hair Removal", "Health",
    "Massage", "Tattoo & Piercing", "Wellness", "Yoga & Fitness",
  ];

  const helpOptions = [
    "More self-booked clients", "Selling products", "Less canceled or missed appointments",
    "Simplified payment processing", "Tracking business statistics", "Attract New Clients",
    "Engage clients", "Social media integration", "Improve financial performance", "Other",
  ];

  const businessTools = [
    "Saloner", "Wpadaj", "Bukka", "Beautymenago", "Timebox", "Fresha", "Zolmi",
    "halo24", "Traf.to", "ClickVisit", "FELG Clinic", "Square Appointments",
    "Acuity Scheduling", "Calendly", "Mindbody",
  ];

  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const steps = [
    { number: 1, title: "Account", icon: User, description: "Create your account" },
    { number: 2, title: "Business", icon: Building2, description: "Business information" },
    { number: 3, title: "Location", icon: MapPin, description: "Location & hours" },
    { number: 4, title: "Team", icon: Users, description: "Team & services" },
    { number: 5, title: "Preferences", icon: Settings, description: "Your preferences" },
    { number: 6, title: "Complete", icon: CheckCircle2, description: "You're all set" },
  ];

  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasDigit = /\d/.test(formData.password);
  const hasMinLength = formData.password.length >= 8;
  const isPasswordValid = hasLetter && hasDigit && hasMinLength;
  const passwordsMatch = formData.password === formData.passwordConfirmation && formData.passwordConfirmation.length > 0;

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchAddress = async (query: string) => {
    if (query.length < 2) {
      setAddressResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Booksy Registration App'
          }
        }
      );
      const data = await response.json();
      setAddressResults(data);
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentStep === 2 && resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, currentStep]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1 || !/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = () => {
    setResendTimer(60);
    setCanResend(false);
    setVerificationCode(["", "", "", ""]);
    toast.info("Verification code sent!");
  };

  const isCodeComplete = verificationCode.every(digit => digit !== "");

  const handleAddService = () => {
    if (newService.name && newService.price) {
      const duration = `${newService.durationHours}:${newService.durationMinutes.padStart(2, "0")}`;
      updateFormData("services", [
        ...formData.services,
        {
          id: Date.now().toString(),
          name: newService.name,
          type: newService.type,
          duration,
          price: newService.price,
          priceType: newService.priceType,
        }
      ]);
      setNewService({ name: "", type: "", durationHours: "0", durationMinutes: "30", price: "", priceType: "Fixed" });
      setIsAddServiceOpen(false);
      toast.success("Service added!");
    }
  };

  const handleAddStaff = () => {
    if (newStaff.name && newStaff.email) {
      updateFormData("staffMembers", [
        ...formData.staffMembers,
        {
          id: Date.now().toString(),
          name: newStaff.name,
          email: newStaff.email,
          phone: `${newStaff.phonePrefix} ${newStaff.phone}`,
          position: newStaff.position,
        }
      ]);
      setNewStaff({ name: "", email: "", phone: "", phonePrefix: "+48", position: "" });
      setIsAddStaffOpen(false);
      toast.success("Staff member added!");
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{6,15}$/;
  const canProceedStep1 =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    emailRegex.test(formData.email.trim()) &&
    phoneRegex.test(formData.phone.trim()) &&
    isPasswordValid &&
    passwordsMatch &&
    formData.termsAccepted;
  const canProceedStep2 = formData.businessName.trim() !== "" && 
    formData.category !== "" && formData.weeklySchedule !== "" && formData.workLocation !== "";
  const canProceedStep3 = formData.address !== "" && formData.buildingNumber.trim() !== "" && formData.latitude !== null && formData.longitude !== null;
  const canProceedStep4 = true; // Step 4 is now optional/skippable
  const canProceedStep5 = formData.profileLiveDate !== "";

  const [isRegistering, setIsRegistering] = useState(false);

  const handleCompleteRegistration = async () => {
    setIsRegistering(true);
    try {
      const fullPhone = formData.phonePrefix && formData.phone 
        ? `${formData.phonePrefix}${formData.phone.replace(/\s/g, '')}` 
        : formData.phone;

      // Register user and create business in one request (monolith)
      const authResponse = await authService.registerBusiness({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: fullPhone,
        businessName: formData.businessName,
        category: formData.category,
        address: formData.address,
        buildingNumber: formData.buildingNumber,
        apartmentNumber: formData.apartmentNumber,
        city: formData.address?.split(',')[1]?.trim() || '',
        country: formData.country,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        businessHours: JSON.stringify(formData.businessHours),
        weeklySchedule: formData.weeklySchedule || undefined,
        workLocation: formData.workLocation || undefined,
        teamSize: formData.teamSize || undefined,
        profileLiveDate: formData.profileLiveDate || undefined,
        helpOptions: formData.helpOptions.length > 0 ? JSON.stringify(formData.helpOptions) : undefined,
        previousTools: formData.previousTools.length > 0 ? JSON.stringify(formData.previousTools) : undefined,
        hasUsedTools: formData.hasUsedTools || undefined,
        staffMembers: formData.staffMembers.length > 0 ? JSON.stringify(formData.staffMembers) : undefined,
        services: formData.services.length > 0 ? JSON.stringify(formData.services) : undefined,
      });

      const { accessToken, user, business } = authResponse;

      // Store tokens in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Store business information if available
      if (business) {
        localStorage.setItem('currentBusinessId', business.id.toString());
        localStorage.setItem('currentBusiness', JSON.stringify(business));
      }

      toast.success("Registration completed! Welcome to Booksy!");
      
      // Redirect to portal (home page)
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status,
        error: error
      });
      
      // Try to extract error message from various sources
      let errorMessage = "Registration failed. Please try again.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      } else if (error?.response?.error) {
        errorMessage = error.response.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:flex lg:w-80 xl:w-96 bg-white border-r border-gray-200 flex-col overflow-hidden">
        <div className="p-8 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Get Started</h2>
          <p className="text-sm text-gray-500">Complete your registration in 6 simple steps</p>
        </div>
        <div className="flex-1 p-6 space-y-2 overflow-y-auto">
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative">
                <div
                  className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : isCompleted
                      ? "bg-gray-50 text-gray-700"
                      : "text-gray-500"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive
                        ? "bg-white text-gray-900"
                        : isCompleted
                        ? "bg-gray-200 text-gray-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium">
                        Step {step.number}
                      </span>
                      {isActive && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-900"}`}>
                      {step.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${isActive ? "text-white/80" : "text-gray-500"}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`ml-5 mt-2 mb-2 h-6 w-0.5 ${
                    isCompleted ? "bg-gray-900" : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="p-6 border-t border-gray-200 shrink-0">
          <div className="text-xs text-gray-500 mb-2">Progress</div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 h-full">
        {/* Step 1: Account Creation */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Create your account</h1>
                <p className="text-gray-600">Enter your information to get started</p>
                <p className="text-sm text-gray-500 mt-3">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-gray-900 font-medium hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => updateFormData("firstName", e.target.value)}
                        className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Surname
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => updateFormData("lastName", e.target.value)}
                        className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <Select value={formData.phonePrefix} onValueChange={(v) => updateFormData("phonePrefix", v)}>
                        <SelectTrigger className="w-28 h-12 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+48">+48</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateFormData("phone", e.target.value)}
                        placeholder="123 456 789"
                        className="flex-1 h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => updateFormData("password", e.target.value)}
                        className="h-12 pr-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className={`flex items-center gap-2 text-xs ${hasLetter ? "text-gray-600" : "text-gray-400"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${hasLetter ? "bg-gray-900" : "bg-gray-300"}`} />
                        At least one letter
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${hasDigit ? "text-gray-600" : "text-gray-400"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${hasDigit ? "bg-gray-900" : "bg-gray-300"}`} />
                        At least one digit
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${hasMinLength ? "text-gray-600" : "text-gray-400"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-gray-900" : "bg-gray-300"}`} />
                        At least 8 characters
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirmation" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="passwordConfirmation"
                        type={showPasswordConfirmation ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.passwordConfirmation}
                        onChange={(e) => updateFormData("passwordConfirmation", e.target.value)}
                        className={`h-12 pr-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 ${
                          formData.passwordConfirmation && !passwordsMatch ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswordConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.passwordConfirmation && !passwordsMatch && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                    {formData.passwordConfirmation && passwordsMatch && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                  </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                        I agree to the <a href="#" className="text-gray-900 font-medium hover:underline">Terms of Service</a> and{" "}
                        <a href="#" className="text-gray-900 font-medium hover:underline">Privacy Policy</a>
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="marketing1"
                        checked={formData.marketing1}
                        onCheckedChange={(checked) => updateFormData("marketing1", checked)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="marketing1" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                        Send me marketing communications (optional)
                      </Label>
                    </div>
                  </div>

              </div>

              <div className="pt-6 border-t border-gray-200 flex justify-end">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full md:w-auto min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Business Basics */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Business Information</h1>
                <p className="text-gray-600">Tell us about your business</p>
              </div>

              <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">Business Category</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {featuredCategories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => updateFormData("category", cat.id)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              formData.category === cat.id
                                ? "border-gray-900 bg-gray-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <Icon className={`h-6 w-6 mx-auto mb-2 ${
                              formData.category === cat.id ? "text-gray-900" : "text-gray-400"
                            }`} />
                            <p className="text-xs font-medium text-gray-700 leading-tight">{cat.name}</p>
                          </button>
                        );
                      })}
                    </div>
                    <Select value={formData.category} onValueChange={(v) => updateFormData("category", v)}>
                      <SelectTrigger className="h-12 border-gray-300 mt-2">
                        <SelectValue placeholder="Or select another category" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherCategories.map((cat) => (
                          <SelectItem key={cat} value={cat.toLowerCase().replace(/\s+/g, "-")}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => updateFormData("businessName", e.target.value)}
                      placeholder="Enter your business name"
                      className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      What does your weekly schedule look like?
                    </Label>
                    <RadioGroup value={formData.weeklySchedule} onValueChange={(v) => updateFormData("weeklySchedule", v)}>
                      <div className="space-y-2">
                        {["Just starting out", "1-4 appointments a week", "5-9 appointments a week", "10-19 appointments a week", "20+ appointments a week"].map((option) => (
                          <div key={option} className="flex items-center space-x-3">
                            <RadioGroupItem value={option.toLowerCase().replace(/\s+/g, "-")} id={option} />
                            <Label htmlFor={option} className="cursor-pointer text-sm text-gray-700 font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">Where do you work?</Label>
                    <RadioGroup value={formData.workLocation} onValueChange={(v) => updateFormData("workLocation", v)}>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-4 border-2 rounded-xl border-gray-200 hover:border-gray-300 transition-colors">
                          <RadioGroupItem value="at-my-place" id="at-my-place" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="at-my-place" className="cursor-pointer font-medium text-gray-900 text-sm">
                              At my place
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">Clients come to your location</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-4 border-2 rounded-xl border-gray-200 hover:border-gray-300 transition-colors">
                          <RadioGroupItem value="at-clients-location" id="at-clients-location" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="at-clients-location" className="cursor-pointer font-medium text-gray-900 text-sm">
                              At the client's location
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">You travel to your clients</p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
                      Referral Code <span className="text-gray-500 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="referralCode"
                      value={formData.referralCode}
                      onChange={(e) => updateFormData("referralCode", e.target.value)}
                      placeholder="Enter referral code"
                      className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>

              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="md:min-w-[200px] h-12 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedStep2}
                  className="md:min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location & Hours */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Location & Business Hours</h1>
                <p className="text-gray-600">Set up where and when you operate</p>
              </div>

              <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Business Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="address"
                        value={addressSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAddressSearch(value);
                          
                          // Clear previous timeout
                          if (searchAddressRef.current) {
                            clearTimeout(searchAddressRef.current);
                          }
                          
                          // Set new timeout for search
                          if (value.length >= 2) {
                            searchAddressRef.current = setTimeout(() => {
                              searchAddress(value);
                            }, 300);
                          } else {
                            setAddressResults([]);
                            setIsSearching(false);
                          }
                        }}
                        placeholder="Search for an address"
                        className="pl-11 h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>
                    {isSearching && (
                      <div className="text-sm text-gray-500 mt-2">Searching...</div>
                    )}
                    {addressResults.length > 0 && !isSearching && (
                      <div className="border border-gray-200 rounded-lg mt-2 max-h-48 overflow-y-auto bg-white shadow-sm z-10">
                        {addressResults.map((addr, index) => {
                          const displayName = addr.display_name || addr.name || '';
                          const addressParts = displayName.split(',').slice(0, 3).join(',');
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                const lat = parseFloat(addr.lat);
                                const lon = parseFloat(addr.lon);
                                updateFormData("address", displayName);
                                updateFormData("latitude", lat);
                                updateFormData("longitude", lon);
                                // Extract building number from address details if available
                                const buildingNumber = addr.address?.house_number || addr.address?.building || '';
                                if (buildingNumber) {
                                  updateFormData("buildingNumber", buildingNumber);
                                }
                                setAddressSearch(addressParts);
                                setAddressResults([]);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                            >
                              <p className="font-medium text-gray-900 text-sm">{displayName}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {formData.address && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buildingNumber" className="text-sm font-medium text-gray-700">
                          Building Number *
                        </Label>
                        <Input
                          id="buildingNumber"
                          value={formData.buildingNumber}
                          onChange={(e) => updateFormData("buildingNumber", e.target.value)}
                          placeholder="e.g., 12"
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apartmentNumber" className="text-sm font-medium text-gray-700">
                          Apartment Number <span className="text-gray-500 font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="apartmentNumber"
                          value={formData.apartmentNumber}
                          onChange={(e) => updateFormData("apartmentNumber", e.target.value)}
                          placeholder="e.g., 3A"
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Pin Your Exact Location on Map</Label>
                    <AddressMapPicker
                      onLocationSelect={(lat, lng, address, buildingNumber) => {
                        updateFormData("latitude", lat);
                        updateFormData("longitude", lng);
                        if (address) {
                          updateFormData("address", address);
                          // Update the address search input field with shortened address
                          const addressParts = address.split(',').slice(0, 3).join(',');
                          setAddressSearch(addressParts);
                        }
                        // Update building number if available
                        if (buildingNumber) {
                          updateFormData("buildingNumber", buildingNumber);
                        }
                      }}
                      selectedPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                      disabled={editingDay !== null}
                    />
                    {formData.latitude && formData.longitude && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (formData.latitude && formData.longitude) {
                          // Open Google Maps with coordinates
                          window.open(`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`, '_blank');
                        } else {
                          // Open Google Maps with address search
                          const fullAddress = `${formData.address} ${formData.buildingNumber || ''} ${formData.apartmentNumber || ''}`.trim();
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank');
                        }
                      }}
                      className="w-full h-12 border-gray-300"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Open in Maps
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Business Hours</Label>
                    <div className="space-y-2">
                      {daysOfWeek.map((day) => {
                        const dayHours = formData.businessHours[day.key];
                        return (
                          <div key={day.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={dayHours.enabled}
                                onCheckedChange={(checked) => {
                                  const newHours = { ...formData.businessHours };
                                  newHours[day.key] = {
                                    enabled: checked,
                                    hours: checked ? "10:00 - 19:00" : "Closed"
                                  };
                                  updateFormData("businessHours", newHours);
                                }}
                              />
                              <Label className="font-medium text-gray-900 text-sm">{day.label}</Label>
                            </div>
                            {dayHours.enabled ? (
                              <button
                                onClick={() => {
                                  const [start, end] = dayHours.hours.split(" - ");
                                  setTempStartTime(start || "10:00");
                                  setTempEndTime(end || "19:00");
                                  setEditingDay(day.key);
                                }}
                                className="text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
                              >
                                {dayHours.hours}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">Closed</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="md:min-w-[200px] h-12 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedStep3}
                  className="md:min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Team */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Team</h1>
                <p className="text-gray-600">Add your team members (optional - you can skip this step)</p>
              </div>

              <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">What's your team size? <span className="text-gray-500 font-normal">(Optional)</span></Label>
                    <RadioGroup value={formData.teamSize} onValueChange={(v) => updateFormData("teamSize", v)}>
                      <div className="space-y-2">
                        {["Just me", "2-4 staff members", "5-9 staff members", "More than 10 staff members"].map((option) => (
                          <div key={option} className="flex items-center space-x-3">
                            <RadioGroupItem value={option.toLowerCase().replace(/\s+/g, "-")} id={option} />
                            <Label htmlFor={option} className="cursor-pointer text-sm text-gray-700 font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">Staff Members <span className="text-gray-500 font-normal">(Optional)</span></Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddStaffOpen(true)}
                        className="h-9 text-xs border-gray-300"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Staff
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{formData.yourName || "You"}</p>
                            <p className="text-xs text-gray-600 mt-0.5">Owner</p>
                          </div>
                        </div>
                      </div>
                      {formData.staffMembers.map((staff) => (
                        <div key={staff.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{staff.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{staff.position || "Staff Member"}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              updateFormData("staffMembers", formData.staffMembers.filter(s => s.id !== staff.id));
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="md:min-w-[200px] h-12 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(5)}
                  className="md:min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Preferences */}
        {currentStep === 5 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Preferences</h1>
                <p className="text-gray-600">Help us customize your experience</p>
              </div>

              <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      How do you hope Booksy can help you? <span className="text-gray-500 font-normal">(Select up to 5)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {helpOptions.map((option) => {
                        const isSelected = formData.helpOptions.includes(option);
                        const canSelect = isSelected || formData.helpOptions.length < 5;
                        return (
                          <button
                            key={option}
                            onClick={() => {
                              if (isSelected) {
                                updateFormData("helpOptions", formData.helpOptions.filter(o => o !== option));
                              } else if (canSelect) {
                                updateFormData("helpOptions", [...formData.helpOptions, option]);
                              }
                            }}
                            disabled={!canSelect && !isSelected}
                            className={`p-3 rounded-xl border text-left transition-all text-sm ${
                              isSelected
                                ? "border-gray-900 bg-gray-50 text-gray-900"
                                : canSelect
                                ? "border-gray-200 hover:border-gray-300 text-gray-700"
                                : "border-gray-200 opacity-50 cursor-not-allowed text-gray-500"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Have you previously used other tools to support your business?
                    </Label>
                    <RadioGroup value={formData.hasUsedTools} onValueChange={(v) => updateFormData("hasUsedTools", v)}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="no" id="no-tools" />
                          <Label htmlFor="no-tools" className="cursor-pointer text-sm text-gray-700 font-normal">
                            No, I haven't
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="yes" id="yes-tools" />
                          <Label htmlFor="yes-tools" className="cursor-pointer text-sm text-gray-700 font-normal">
                            Yes, I have
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                    {formData.hasUsedTools === "yes" && (
                      <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50">
                        {businessTools.map((tool) => {
                          const isSelected = formData.previousTools.includes(tool);
                          return (
                            <div key={tool} className="flex items-center space-x-2">
                              <Checkbox
                                id={tool}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFormData("previousTools", [...formData.previousTools, tool]);
                                  } else {
                                    updateFormData("previousTools", formData.previousTools.filter(t => t !== tool));
                                  }
                                }}
                              />
                              <Label htmlFor={tool} className="cursor-pointer text-sm text-gray-700 font-normal">
                                {tool}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileLiveDate" className="text-sm font-medium text-gray-700">
                      When do you want your profile to go live?
                    </Label>
                    <Select value={formData.profileLiveDate} onValueChange={(v) => updateFormData("profileLiveDate", v)}>
                      <SelectTrigger className="h-12 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="3-days">In 3 days</SelectItem>
                        <SelectItem value="1-week">In 1 week</SelectItem>
                        <SelectItem value="2-weeks">In 2 weeks</SelectItem>
                        <SelectItem value="1-month">In 1 month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(4)}
                  className="md:min-w-[200px] h-12 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(6)}
                  disabled={!canProceedStep5}
                  className="md:min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === 6 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <div className="w-full">
              <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 text-white mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                    You're all set, {formData.yourName || "there"}!
                  </h1>
                  <p className="text-gray-600">To help your business thrive, here are a few ways Booksy will do that:</p>
                </div>

              <div className="space-y-3">
                {[
                  { icon: User, text: "Clients book themselves with your Booksy profile" },
                  { icon: Bell, text: "No-shows are history with automated reminders and custom fees" },
                  { icon: Sparkles, text: "Easy social bookings with social tools to turn followers into clients" },
                  { icon: DollarSign, text: "Flexible modern payments with multiple payment methods, including your phone" },
                  { icon: Mail, text: "Fresh connections with clients using marketing tools for outreach" },
                ].map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div key={idx} className="bg-white rounded-xl p-4 flex items-start gap-3 border border-gray-200">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-200">
                        <Icon className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-gray-700 leading-relaxed">{feature.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(5)}
                  className="md:min-w-[200px] h-12 border-gray-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleCompleteRegistration}
                  disabled={isRegistering}
                  className="md:min-w-[200px] h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? "Registering..." : "Complete Registration"}
                  {!isRegistering && <Check className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g., Haircut"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Input
                value={newService.type}
                onChange={(e) => setNewService({ ...newService, type: e.target.value })}
                placeholder="e.g., Hair Service"
                className="border-gray-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Hours)</Label>
                <Select value={newService.durationHours} onValueChange={(v) => setNewService({ ...newService, durationHours: v })}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(h => (
                      <SelectItem key={h} value={h.toString()}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (Minutes)</Label>
                <Select value={newService.durationMinutes} onValueChange={(v) => setNewService({ ...newService, durationMinutes: v })}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map(m => (
                      <SelectItem key={m} value={m.toString().padStart(2, "0")}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                placeholder="0.00"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <Select value={newService.priceType} onValueChange={(v) => setNewService({ ...newService, priceType: v })}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="From">From</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddServiceOpen(false)} className="flex-1 border-gray-300">
                Cancel
              </Button>
              <Button onClick={handleAddService} className="flex-1 bg-gray-900 hover:bg-gray-800">Add Service</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Full name"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="email@example.com"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="flex gap-2">
                <Select value={newStaff.phonePrefix} onValueChange={(v) => setNewStaff({ ...newStaff, phonePrefix: v })}>
                  <SelectTrigger className="w-28 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+48">+48</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+44">+44</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="123 456 789"
                  className="flex-1 border-gray-300"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={newStaff.position}
                onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                placeholder="e.g., Stylist, Therapist"
                className="border-gray-300"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddStaffOpen(false)} className="flex-1 border-gray-300">
                Cancel
              </Button>
              <Button onClick={handleAddStaff} className="flex-1 bg-gray-900 hover:bg-gray-800">Add Staff</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Business Hours Dialog */}
      <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingDay && daysOfWeek.find(d => d.key === editingDay)?.label} Hours
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Opening Time</Label>
                <Input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Closing Time</Label>
                <Input
                  type="time"
                  value={tempEndTime}
                  onChange={(e) => setTempEndTime(e.target.value)}
                  className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingDay(null)} 
                className="flex-1 border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingDay) {
                    const newHours = { ...formData.businessHours };
                    newHours[editingDay] = {
                      enabled: true,
                      hours: `${tempStartTime} - ${tempEndTime}`
                    };
                    updateFormData("businessHours", newHours);
                    setEditingDay(null);
                  }
                }} 
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationPage;
