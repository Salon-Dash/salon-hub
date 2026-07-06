import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Search, Plus, ChevronRight, GripVertical, Sparkles, FolderPlus, Package, Layers, Loader2, Box, EyeOff, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { useServices } from "@/hooks/useServices";
import { useAddons } from "@/hooks/useAddons";
import { useNavigation } from "@/utils/navigationUtils";

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

// Helper function to get color class from color string
const getColorClass = (color?: string): string => {
  if (!color) return "bg-gray-400";
  // If color is a hex code, use it directly
  if (color.startsWith("#")) {
    return "";
  }
  // If color is a Tailwind class, use it
  if (color.startsWith("bg-")) {
    return color;
  }
  // Default fallback
  return "bg-gray-400";
};

export default function ItemsCategoryPage() {
  const navigate = useNavigate();
  const { getPath } = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<string | number>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"services" | "addons">("services");
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryVisibility, setCategoryVisibility] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch data from API
  const { categories: apiCategories, loading: categoriesLoading, createCategory } = useCategories();
  const { services: apiServices, loading: servicesLoading } = useServices();
  const { addons: apiAddons, loading: addonsLoading } = useAddons();

  // Build categories list with "All Categories" and "Not categorized" options
  const categories = useMemo(() => {
    const allCategories = [
      { id: "all", name: "All Categories", count: apiServices?.length || 0, isSpecial: true },
      { id: "uncategorized", name: "Not categorized", count: apiServices?.filter(s => !s.categoryId)?.length || 0, isSpecial: true },
      ...(apiCategories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        count: cat.serviceCount || apiServices?.filter(s => s.categoryId === cat.id)?.length || 0,
        isSpecial: false,
        color: cat.color,
      })),
    ];
    return allCategories;
  }, [apiCategories, apiServices]);

  // Filter services based on selected category and search query
  const filteredServices = useMemo(() => {
    if (!apiServices) return [];
    
    let filtered = apiServices.filter((service) => {
      // Filter by category
      if (selectedCategory === "all") {
        // Show all services
      } else if (selectedCategory === "uncategorized") {
        // Show only services without category
        if (service.categoryId) return false;
      } else {
        // Show only services in selected category
        if (service.categoryId !== selectedCategory) return false;
      }
      
      // Filter by search query
      const matchesSearch = service.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
    
    return filtered;
  }, [apiServices, selectedCategory, searchQuery]);

  // Filter addons based on search query
  const filteredAddons = useMemo(() => {
    if (!apiAddons) return [];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return apiAddons.filter(addon => 
        addon.name.toLowerCase().includes(query)
      );
    }
    
    return apiAddons;
  }, [apiAddons, searchQuery]);

  const currentItems = activeTab === "services" ? filteredServices : filteredAddons;
  const loading = categoriesLoading || servicesLoading || addonsLoading;

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Services & Combo Services
              </h1>
            </div>
            <div className="relative w-64">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search in services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("services")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "services"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab("addons")}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "addons"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Addons
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden bg-gray-50">
          {/* Left Sidebar - Categories */}
          <div className="w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-between ${
                      selectedCategory === category.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          category.id === "all" ? "font-bold" : "font-normal"
                        }
                      >
                        {category.name}
                      </span>
                      {category.count !== undefined && (
                        <span className="text-xs text-gray-500">
                          ({category.count})
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Content Area - Services/Addons List */}
          <div className="flex-1 overflow-y-auto bg-white p-6">
            {(servicesLoading || addonsLoading) ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No {activeTab} found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentItems.map((item) => {
                  const colorClass = getColorClass(item.color);
                  const colorStyle = item.color?.startsWith("#") ? { backgroundColor: item.color } : {};
                  const isCombo = activeTab === "services" && item.serviceType === 'COMBO';
                  const isAddon = activeTab === "addons";
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => {
                        if (activeTab === "services") {
                          if (isCombo) {
                            navigate(getPath("edit-combo-service", item.id));
                          } else {
                            navigate(getPath("edit-service", item.id));
                          }
                        } else if (activeTab === "addons") {
                          // TODO: Navigate to edit addon page when implemented
                          // navigate(getPath("edit-addon", item.id));
                        }
                      }}
                    >
                      {/* Colored Left Bar */}
                      <div 
                        className={`w-1 h-16 rounded-full ${colorClass}`}
                        style={colorStyle}
                      />

                      {/* Service/Addon Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-medium text-gray-900">
                            {item.name}
                          </h3>
                          {isAddon ? (
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                              <Box size={12} className="mr-1" />
                              ADDON
                            </Badge>
                          ) : isCombo ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                              <Package size={12} className="mr-1" />
                              COMBO
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              <Layers size={12} className="mr-1" />
                              SERVICE
                            </Badge>
                          )}
                          {/* Flag badges — make the SETTINGS toggles visible at a glance */}
                          {!isAddon && item.isVisible === false && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-xs" title="Hidden from the customer app">
                              <EyeOff size={12} className="mr-1" />
                              HIDDEN
                            </Badge>
                          )}
                          {!isAddon && item.mobileService && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs" title="Performed at the client's location">
                              <MapPin size={12} className="mr-1" />
                              MOBILE
                            </Badge>
                          )}
                          {!isAddon && item.virtualAppointment && (
                            <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 text-xs" title="Online / video appointment">
                              <Video size={12} className="mr-1" />
                              VIRTUAL
                            </Badge>
                          )}
                          {!isAddon && !isCombo && item.serviceType && !["standard", "SERVICE"].includes(item.serviceType) && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                              {item.serviceType.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {!isAddon && <span>{formatDuration(item.durationMinutes)}</span>}
                          <span className="font-semibold text-gray-900">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>

                      {/* Right Arrow */}
                      <ChevronRight
                        size={20}
                        className="text-gray-400 group-hover:text-gray-600 transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="fixed bottom-8 right-8 w-14 h-14 bg-black text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-10">
              <Plus size={24} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 mb-2 bg-white border border-gray-200 shadow-lg rounded-lg p-1"
          >
            <DropdownMenuItem
              onClick={() => {
                navigate(getPath("add-service"));
              }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 rounded-md"
            >
              <Sparkles size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Create service</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsCreateCategoryOpen(true);
              }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 rounded-md"
            >
              <FolderPlus size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Create category</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigate(getPath("add-addon"));
              }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 rounded-md"
            >
              <Package size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Create addons</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigate(getPath("add-combo-service"));
              }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 rounded-md"
            >
              <Layers size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Create combo</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Category Dialog */}
        <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category name</Label>
                <Input
                  id="category-name"
                  placeholder="Enter category name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="category-visibility">Visibility</Label>
                <Switch
                  id="category-visibility"
                  checked={categoryVisibility}
                  onCheckedChange={setCategoryVisibility}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateCategoryOpen(false);
                  setCategoryName("");
                  setCategoryVisibility(true);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setIsCreating(true);
                    await createCategory({
                      name: categoryName.trim(),
                    });
                    setIsCreateCategoryOpen(false);
                    setCategoryName("");
                    setCategoryVisibility(true);
                  } catch (error) {
                    console.error("Failed to create category:", error);
                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={!categoryName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
