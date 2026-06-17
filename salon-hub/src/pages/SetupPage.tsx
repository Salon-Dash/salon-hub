import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Building2, 
  Clock, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Users,
  ChevronRight
} from "lucide-react";

const settingsCategories = [
  {
    id: "business",
    title: "Business Settings",
    description: "Manage your salon details and locations",
    icon: Building2,
    items: ["Business Profile", "Locations", "Opening Hours"],
    color: "text-appointment-blue",
    bgColor: "bg-appointment-blue/10",
    borderColor: "border-appointment-blue/20"
  },
  {
    id: "booking",
    title: "Booking Settings",
    description: "Configure your booking preferences",
    icon: Clock,
    items: ["Booking Rules", "Online Booking", "Cancellation Policy"],
    color: "text-appointment-purple",
    bgColor: "bg-appointment-purple/10",
    borderColor: "border-appointment-purple/20"
  },
  {
    id: "payments",
    title: "Payments",
    description: "Manage payment methods and billing",
    icon: CreditCard,
    items: ["Payment Methods", "Invoices", "Tax Settings"],
    color: "text-status-completed",
    bgColor: "bg-status-completed/10",
    borderColor: "border-status-completed/20"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Set up reminders and alerts",
    icon: Bell,
    items: ["Email Notifications", "SMS Settings", "Push Notifications"],
    color: "text-appointment-coral",
    bgColor: "bg-appointment-coral/10",
    borderColor: "border-appointment-coral/20"
  },
  {
    id: "security",
    title: "Security",
    description: "Manage access and permissions",
    icon: Shield,
    items: ["Password", "Two-Factor Auth", "Login History"],
    color: "text-status-pending",
    bgColor: "bg-status-pending/10",
    borderColor: "border-status-pending/20"
  },
  {
    id: "branding",
    title: "Branding",
    description: "Customize your salon's appearance",
    icon: Palette,
    items: ["Logo & Colors", "Email Templates", "Receipt Design"],
    color: "text-appointment-pink",
    bgColor: "bg-appointment-pink/10",
    borderColor: "border-appointment-pink/20"
  },
  {
    id: "online",
    title: "Online Presence",
    description: "Manage your online booking page",
    icon: Globe,
    items: ["Booking Page", "Widget", "Custom Domain"],
    color: "text-appointment-teal",
    bgColor: "bg-appointment-teal/10",
    borderColor: "border-appointment-teal/20"
  },
  {
    id: "team",
    title: "Team Permissions",
    description: "Control staff access levels",
    icon: Users,
    items: ["Roles", "Permissions", "Access Logs"],
    color: "text-appointment-green",
    bgColor: "bg-appointment-green/10",
    borderColor: "border-appointment-green/20"
  },
];

export default function SetupPage() {
  const location = useLocation();
  const businessCardRef = useRef<HTMLDivElement | null>(null);
  const focusedCategory = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("focus");
  }, [location.search]);

  useEffect(() => {
    if (focusedCategory !== "business") return;
    businessCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedCategory]);

  return (
    <AppLayout>
      <PageHeader
        title="Setup"
        subtitle="Configure your salon settings and preferences"
      />

      <div className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {settingsCategories.map((category, index) => {
            const Icon = category.icon;
            const isFocused = focusedCategory === category.id;
            return (
              <Card
                key={category.title} 
                ref={category.id === "business" ? businessCardRef : null}
                className={`border-border/60 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group card-interactive ${category.borderColor} hover:border-2 ${isFocused ? "ring-2 ring-appointment-blue/40 border-appointment-blue/50 shadow-lg" : ""}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-3 rounded-xl ${category.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold">{category.title}</CardTitle>
                        <CardDescription className="text-sm font-medium mt-0.5">{category.description}</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all ${category.color} group-hover:${category.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.items.map((item) => (
                      <Button 
                        key={item} 
                        variant="secondary" 
                        size="sm" 
                        className={`text-xs border-border/60 hover:border-${category.color.split('-')[1]}/30 hover:bg-${category.bgColor.split('/')[0]}/5 transition-all`}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
