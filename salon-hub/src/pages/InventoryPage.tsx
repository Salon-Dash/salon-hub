import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const inventoryItems = [
  { id: "1", name: "Garnier - Neck Riley", category: "Hair Care", stock: 12, price: "£44", lowStock: false },
  { id: "2", name: "Kerastase - Fresh Affair Spray", category: "Hair Care", stock: 3, price: "£52", lowStock: true },
  { id: "3", name: "Kerastase Discipline Pack", category: "Hair Care", stock: 8, price: "£30", lowStock: false },
  { id: "4", name: "Ordinary Beauty Kit", category: "Skincare", stock: 2, price: "£25", lowStock: true },
  { id: "5", name: "Wella Hair Mist", category: "Hair Care", stock: 15, price: "£28", lowStock: false },
  { id: "6", name: "Caramel Frappe Oil", category: "Body Care", stock: 9, price: "£27", lowStock: false },
  { id: "7", name: "Givenchy L'Interporel", category: "Skincare", stock: 1, price: "£16", lowStock: true },
  { id: "8", name: "Shateria - Aloe Vera", category: "Body Care", stock: 7, price: "£40", lowStock: false },
];

export default function InventoryPage() {
  const lowStockCount = inventoryItems.filter(i => i.lowStock).length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + parseFloat(item.price.replace("£", "")) * item.stock, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Inventory"
        subtitle="Manage your product stock and supplies"
        actions={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all">
            <Plus size={16} />
            Add Product
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Enhanced Quick Stats */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Products
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-appointment-blue/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Package className="h-5 w-5 text-appointment-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{inventoryItems.length}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Low Stock Items
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-status-pending/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-status-pending" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-status-pending">{lowStockCount}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Value
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-status-completed/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <TrendingUp className="h-5 w-5 text-status-completed" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-status-completed">£{totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-10 border-border/60 focus:border-accent/50 transition-all" 
            />
          </div>
          <Button 
            variant="outline" 
            className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
          >
            <Filter size={16} />
            Filters
          </Button>
        </div>

        {/* Enhanced Products Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {inventoryItems.map((item, index) => (
            <Card 
              key={item.id} 
              className="border-border/60 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group card-interactive"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 mb-4 flex items-center justify-center border border-border/60 group-hover:border-accent/30 transition-all">
                  <Package className="h-10 w-10 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1 mb-1">{item.name}</h4>
                    <p className="text-xs text-muted-foreground font-medium">{item.category}</p>
                  </div>
                  {item.lowStock && (
                    <Badge className="bg-status-pending/10 text-status-pending border-status-pending/20 text-[10px] px-1.5 py-0.5 ml-2">
                      Low
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.stock} in stock
                  </span>
                  <span className="font-bold text-status-completed text-base">{item.price}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
