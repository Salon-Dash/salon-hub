import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, ChevronDown, Clock, DollarSign, Star, Pencil, Trash2, Loader2, AlertCircle, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useServices } from "@/hooks/useServices";
import { useCategories } from "@/hooks/useCategories";
import { useBusinessId } from "@/hooks/useBusinessId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Service } from "@/services/serviceService";
import type { Category } from "@/services/categoryService";

function formatDuration(minutes?: number) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function formatPrice(price?: number) {
  if (price == null) return "Price TBD";
  return `${price.toFixed(2)} zł`;
}

export default function ServicesPage() {
  const businessId = useBusinessId();
  const { services, loading: servicesLoading, createService, updateService, deleteService } = useServices(businessId);
  const { categories, loading: categoriesLoading, createCategory, deleteCategory } = useCategories(businessId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Add service dialog
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    categoryId: "",
    durationMinutes: "",
    price: "",
    description: "",
  });
  const [savingService, setSavingService] = useState(false);

  // Edit service dialog
  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Add category dialog
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [savingCategory, setSavingCategory] = useState(false);

  const loading = servicesLoading || categoriesLoading;

  // Filter services
  const filteredServices = services.filter(s => {
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "all" ||
      String(s.categoryId) === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const grouped: Array<{ category: Category | null; services: Service[] }> = [];
  const uncategorized: Service[] = [];

  for (const svc of filteredServices) {
    if (!svc.categoryId) {
      uncategorized.push(svc);
    }
  }

  for (const cat of categories) {
    const catServices = filteredServices.filter(s => s.categoryId === cat.id);
    if (catServices.length > 0) {
      grouped.push({ category: cat, services: catServices });
    }
  }

  if (uncategorized.length > 0) {
    grouped.push({ category: null, services: uncategorized });
  }

  const handleAddService = async () => {
    if (!serviceForm.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    setSavingService(true);
    try {
      await createService({
        name: serviceForm.name.trim(),
        categoryId: serviceForm.categoryId ? Number(serviceForm.categoryId) : undefined,
        durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : undefined,
        price: serviceForm.price ? Number(serviceForm.price) : undefined,
        description: serviceForm.description || undefined,
      });
      setAddServiceOpen(false);
      setServiceForm({ name: "", categoryId: "", durationMinutes: "", price: "", description: "" });
    } finally {
      setSavingService(false);
    }
  };

  const handleEditService = async () => {
    if (!editingService) return;
    setSavingService(true);
    try {
      await updateService(editingService.id, {
        name: editingService.name,
        categoryId: editingService.categoryId,
        durationMinutes: editingService.durationMinutes,
        price: editingService.price,
        description: editingService.description,
      });
      setEditServiceOpen(false);
      setEditingService(null);
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteService(id);
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSavingCategory(true);
    try {
      await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description || undefined,
      });
      setAddCategoryOpen(false);
      setCategoryForm({ name: "", description: "" });
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Services"
        subtitle="Manage your service offerings and pricing"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setAddCategoryOpen(true)}
            >
              <Tag size={16} />
              Add Category
            </Button>
            <Button
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all"
              onClick={() => setAddServiceOpen(true)}
            >
              <Plus size={16} />
              Add Service
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              className="pl-10 border-border/60 focus:border-accent/50 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger className="w-40 border-border/60 hover:border-accent/30 transition-all">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && services.length === 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Tag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No services yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first service to start accepting bookings
              </p>
              <Button onClick={() => setAddServiceOpen(true)} className="gap-2">
                <Plus size={16} />
                Add Service
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Services grouped by category */}
        {!loading && grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map((group, catIndex) => (
              <Card
                key={group.category?.id ?? "uncategorized"}
                className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm"
                style={{ animationDelay: `${catIndex * 100}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {group.category?.name ?? "Uncategorized"}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {group.services.length} service{group.services.length !== 1 ? "s" : ""} available
                      </CardDescription>
                    </div>
                    {group.category && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete category "${group.category!.name}"? Services in this category won't be deleted.`)) {
                            deleteCategory(group.category!.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.services.map((service, index) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 transition-all duration-300 cursor-pointer group card-interactive"
                        style={{ animationDelay: `${(catIndex * 100) + (index * 30)}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="font-semibold text-sm truncate">{service.name}</h4>
                            {!service.isActive && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                            {service.durationMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDuration(service.durationMinutes)}
                              </span>
                            )}
                            {service.description && (
                              <span className="truncate max-w-32">{service.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <div className="text-lg font-bold text-status-completed">
                            {formatPrice(service.price)}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={e => {
                                e.stopPropagation();
                                setEditingService(service);
                                setEditServiceOpen(true);
                              }}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteService(service.id, service.name);
                              }}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Dialog */}
      <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>Create a new service for your clients to book.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                placeholder="e.g. Hair Cut, Swedish Massage"
                value={serviceForm.name}
                onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={serviceForm.categoryId}
                onValueChange={v => setServiceForm(f => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 60"
                  value={serviceForm.durationMinutes}
                  onChange={e => setServiceForm(f => ({ ...f, durationMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Price (zł)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 35.00"
                  value={serviceForm.price}
                  onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description of the service"
                value={serviceForm.description}
                onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddServiceOpen(false)}>Cancel</Button>
            <Button onClick={handleAddService} disabled={savingService}>
              {savingService && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editServiceOpen} onOpenChange={setEditServiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Service Name *</Label>
                <Input
                  value={editingService.name}
                  onChange={e => setEditingService(s => s ? { ...s, name: e.target.value } : s)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingService.categoryId ? String(editingService.categoryId) : ""}
                  onValueChange={v => setEditingService(s => s ? { ...s, categoryId: v ? Number(v) : undefined } : s)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={editingService.durationMinutes ?? ""}
                    onChange={e => setEditingService(s => s ? { ...s, durationMinutes: e.target.value ? Number(e.target.value) : undefined } : s)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (zł)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingService.price ?? ""}
                    onChange={e => setEditingService(s => s ? { ...s, price: e.target.value ? Number(e.target.value) : undefined } : s)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingService.description ?? ""}
                  onChange={e => setEditingService(s => s ? { ...s, description: e.target.value } : s)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditServiceOpen(false)}>Cancel</Button>
            <Button onClick={handleEditService} disabled={savingService}>
              {savingService && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Group your services into categories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g. Hair Services, Massage & Wellness"
                value={categoryForm.name}
                onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description"
                value={categoryForm.description}
                onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={savingCategory}>
              {savingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
