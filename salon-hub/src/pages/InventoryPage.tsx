import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Package, TrendingUp, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAddons } from "@/hooks/useAddons";
import { useBusinessId } from "@/hooks/useBusinessId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Addon } from "@/services/addonService";

export default function InventoryPage() {
  const businessId = useBusinessId();
  const { addons, loading, createAddon, updateAddon, deleteAddon } = useAddons(businessId);

  const [searchQuery, setSearchQuery] = useState("");

  // Add addon dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", priceType: "FIXED" as "FIXED" | "FROM" | "RANGE" });
  const [saving, setSaving] = useState(false);

  // Edit addon dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  const filtered = addons.filter(a =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = addons.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const activeCount = addons.filter(a => a.isActive).length;

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createAddon({
        name: form.name.trim(),
        description: form.description || undefined,
        price: form.price ? Number(form.price) : undefined,
        priceType: form.priceType,
      });
      setAddOpen(false);
      setForm({ name: "", description: "", price: "", priceType: "FIXED" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAddon) return;
    setSaving(true);
    try {
      await updateAddon(editingAddon.id, {
        name: editingAddon.name,
        description: editingAddon.description,
        price: editingAddon.price,
        priceType: editingAddon.priceType,
        isActive: editingAddon.isActive,
      });
      setEditOpen(false);
      setEditingAddon(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete addon "${name}"?`)) return;
    await deleteAddon(id);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Add-ons & Extras"
        subtitle="Manage add-on services and extras that clients can book alongside main services"
        actions={
          <Button
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={16} />
            Add Extra
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Add-ons
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-appointment-blue/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Package className="h-5 w-5 text-appointment-blue" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{addons.length}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Active Add-ons
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-status-completed/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Tag className="h-5 w-5 text-status-completed" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-status-completed">{activeCount}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Value
              </CardTitle>
              <div className="p-2.5 rounded-xl bg-appointment-purple/10 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <TrendingUp className="h-5 w-5 text-appointment-purple" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-appointment-purple">{totalValue.toFixed(2)} zł</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search add-ons..."
              className="pl-10 border-border/60 focus:border-accent/50 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && addons.length === 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No add-ons yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add extras like hot towel, deep conditioning, or aromatherapy that clients can book alongside main services.
              </p>
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus size={16} />
                Add Extra
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add-ons Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((addon, index) => (
              <Card
                key={addon.id}
                className="border-border/60 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group card-interactive"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{addon.name}</h4>
                        {!addon.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {addon.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{addon.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditingAddon(addon); setEditOpen(true); }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(addon.id, addon.name)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <Badge variant="secondary" className="text-xs">
                      {addon.priceType ?? "FIXED"}
                    </Badge>
                    <span className="font-bold text-status-completed text-base">
                      {addon.price != null ? `${addon.price.toFixed(2)} zł` : "Price TBD"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Extra / Add-on</DialogTitle>
            <DialogDescription>Create a new add-on service that clients can book alongside main services.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Hot Towel, Deep Conditioning"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (zł)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 10.00"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Price Type</Label>
                <Select
                  value={form.priceType}
                  onValueChange={v => setForm(f => ({ ...f, priceType: v as "FIXED" | "FROM" | "RANGE" }))}
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Extra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
          </DialogHeader>
          {editingAddon && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editingAddon.name}
                  onChange={e => setEditingAddon(a => a ? { ...a, name: e.target.value } : a)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingAddon.description ?? ""}
                  onChange={e => setEditingAddon(a => a ? { ...a, description: e.target.value } : a)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price (zł)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAddon.price ?? ""}
                    onChange={e => setEditingAddon(a => a ? { ...a, price: e.target.value ? Number(e.target.value) : undefined } : a)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price Type</Label>
                  <Select
                    value={editingAddon.priceType ?? "FIXED"}
                    onValueChange={v => setEditingAddon(a => a ? { ...a, priceType: v as "FIXED" | "FROM" | "RANGE" } : a)}
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingAddon.isActive}
                  onChange={e => setEditingAddon(a => a ? { ...a, isActive: e.target.checked } : a)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Active (visible to clients)</Label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
