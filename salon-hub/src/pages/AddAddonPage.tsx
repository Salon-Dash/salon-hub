import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  HelpCircle,
  Camera,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useAddons } from "@/hooks/useAddons";
import { Loader2 } from "lucide-react";
import { useNavigation } from "@/utils/navigationUtils";

export default function AddAddonPage() {
  const navigate = useNavigate();
  const { getPath } = useNavigation();
  const { createAddon } = useAddons();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    addonName: "",
    price: "0.00",
    priceType: "FIXED",
    description: "",
    color: "#6366f1", // Default indigo color
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.addonName.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await createAddon({
        name: formData.addonName,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || undefined,
        priceType: formData.priceType as 'FIXED' | 'FROM' | 'RANGE',
        color: formData.color,
      });
      navigate(getPath("items-category"));
    } catch (error) {
      console.error("Failed to save addon:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndAddNext = async () => {
    if (!formData.addonName.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await createAddon({
        name: formData.addonName,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || undefined,
        priceType: formData.priceType as 'FIXED' | 'FROM' | 'RANGE',
        color: formData.color,
      });
      // Reset form for next add-on
      setFormData({
        addonName: "",
        price: "0.00",
        priceType: "FIXED",
        description: "",
        color: "#6366f1",
      });
    } catch (error) {
      console.error("Failed to save addon:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-gray-50">
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
              <h1 className="text-xl font-bold text-gray-900">Add Add-on</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveAndAddNext}
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50"
                disabled={isSaving || !formData.addonName.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "SAVE & ADD NEXT ADD-ON"
                )}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isSaving || !formData.addonName.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "SAVE"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Main Form */}
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                  {/* Add-on Name */}
                  <div className="space-y-2">
                    <Label htmlFor="addon-name">Add-on Name</Label>
                    <Input
                      id="addon-name"
                      placeholder="Enter add-on name"
                      value={formData.addonName}
                      onChange={(e) =>
                        handleInputChange("addonName", e.target.value)
                      }
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="addon-color">Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="addon-color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange("color", e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formData.color}
                        onChange={(e) => handleInputChange("color", e.target.value)}
                        placeholder="#6366f1"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">zł</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) =>
                              handleInputChange("price", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="w-32">
                        <Select
                          value={formData.priceType}
                          onValueChange={(value) =>
                            handleInputChange("priceType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">Fixed</SelectItem>
                            <SelectItem value="FROM">From</SelectItem>
                            <SelectItem value="RANGE">Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description">
                        Description (optional)
                      </Label>
                      <HelpCircle size={16} className="text-gray-400" />
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Enter description..."
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Add Media */}
                  <div className="space-y-2">
                    <Label>Add Media</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-gray-400 transition-colors cursor-pointer">
                      <Camera size={32} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Add media</span>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
                  <h3 className="text-base font-bold text-gray-900">Details</h3>

                  {/* Note: Additional fields like online booking, limits, and tax rate */}
                  {/* can be added to the backend model if needed in the future */}
                </div>
              </div>

              {/* Right Column - Valid For Section */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">
                    Valid for
                  </h3>
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed border-2 border-gray-300 hover:border-gray-400"
                  >
                    <Plus size={18} />
                    Add services
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



