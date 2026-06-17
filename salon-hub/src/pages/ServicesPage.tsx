import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, ChevronDown, Clock, DollarSign, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const serviceCategories = [
  {
    name: "Hair Services",
    icon: "✂️",
    services: [
      { id: "1", name: "Hair Cut", duration: "45 min", price: "£35", popular: true, bookings: 89 },
      { id: "2", name: "Hair Coloring", duration: "2 hr", price: "£85", popular: true, bookings: 67 },
      { id: "3", name: "Blow Dry", duration: "30 min", price: "£25", popular: false, bookings: 45 },
      { id: "4", name: "Hair Treatment", duration: "1 hr", price: "£55", popular: false, bookings: 32 },
    ],
  },
  {
    name: "Beard & Grooming",
    icon: "🧔",
    services: [
      { id: "5", name: "Beard Trim", duration: "20 min", price: "£15", popular: true, bookings: 78 },
      { id: "6", name: "Full Grooming", duration: "45 min", price: "£45", popular: false, bookings: 34 },
      { id: "7", name: "Hot Towel Shave", duration: "30 min", price: "£25", popular: false, bookings: 28 },
    ],
  },
  {
    name: "Massage & Wellness",
    icon: "💆",
    services: [
      { id: "8", name: "Swedish Massage", duration: "1 hr", price: "£65", popular: true, bookings: 92 },
      { id: "9", name: "Balinese Massage", duration: "1 hr 15 min", price: "£75", popular: true, bookings: 56 },
      { id: "10", name: "Hot Stone Therapy", duration: "1 hr 30 min", price: "£95", popular: false, bookings: 23 },
    ],
  },
];

export default function ServicesPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Services"
        subtitle="Manage your service offerings and pricing"
        actions={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all">
            <Plus size={16} />
            Add Service
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Enhanced Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search services..." 
              className="pl-10 border-border/60 focus:border-accent/50 transition-all" 
            />
          </div>
          <Button 
            variant="outline" 
            className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
          >
            <Filter size={16} />
            Category
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* Enhanced Services by Category */}
        <div className="space-y-6">
          {serviceCategories.map((category, catIndex) => (
            <Card 
              key={category.name}
              className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm"
              style={{ animationDelay: `${catIndex * 100}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{category.icon}</div>
                  <div>
                    <CardTitle className="text-lg font-bold">{category.name}</CardTitle>
                    <CardDescription className="mt-0.5">{category.services.length} services available</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {category.services.map((service, index) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 transition-all duration-300 cursor-pointer group card-interactive"
                      style={{ animationDelay: `${(catIndex * 100) + (index * 30)}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h4 className="font-semibold text-sm truncate">{service.name}</h4>
                          {service.popular && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                              <Star size={8} className="fill-white" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {service.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign size={12} />
                            {service.bookings} bookings
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-lg font-bold text-status-completed group-hover:scale-110 transition-transform">
                          {service.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
