import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const emptyDish = {
  name: "",
  description: "",
  selling_price: 0,
  categories: [] as string[],
  dish_type: "veg" as "veg" | "non-veg",
  stock_quantity: 10,
  image_url: ""
};

const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDish);

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, is_available: form.stock_quantity > 0 };
      if (editId) {
        const { error } = await supabase.from("dishes").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dishes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-dishes"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyDish);
      toast.success(editId ? "Dish updated!" : "Dish added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dishes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-dishes"] });
      toast.success("Dish deleted");
    },
  });

  const openEdit = (dish: any) => {
    setEditId(dish.id);
    setForm({
      name: dish.name,
      description: dish.description || "",
      selling_price: dish.selling_price || 0,
      categories: dish.categories || [],
      dish_type: dish.dish_type || "veg",
      stock_quantity: dish.stock_quantity || 0,
      image_url: dish.image_url || ""
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Menu Items</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyDish); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Dish</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Dish" : "Add New Dish"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Selling Price (₹)</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></div>
                <div><Label>Stock Qty</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} /></div>
              </div>

              <div><Label>Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={form.dish_type === "veg" ? "default" : "outline"} className={form.dish_type === "veg" ? "bg-green-600" : ""} onClick={() => setForm({ ...form, dish_type: "veg" })}>🥗 Veg</Button>
                  <Button type="button" variant={form.dish_type === "non-veg" ? "default" : "outline"} className={form.dish_type === "non-veg" ? "bg-red-600" : ""} onClick={() => setForm({ ...form, dish_type: "non-veg" })}>🍗 Non-Veg</Button>
                </div>
              </div>

              <div><Label>Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['snacks', 'breakfast', 'lunch', 'dinner', 'special'].map((cat) => (
                    <Button key={cat} type="button" variant={form.categories.includes(cat) ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, categories: form.categories.includes(cat) ? form.categories.filter(c => c !== cat) : [...form.categories, cat] })}>{cat}</Button>
                  ))}
                </div>
              </div>

              <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} className="w-full">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Update Dish" : "Add Dish"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {dishes.map((dish: any) => (
          <Card key={dish.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {dish.image_url ? <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center">🍽️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{dish.name}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-primary font-medium">₹{dish.selling_price}</span>
                  <Badge variant="outline" className={dish.dish_type === 'veg' ? 'text-green-600' : 'text-red-600'}>{dish.dish_type === 'veg' ? 'VEG' : 'NON-VEG'}</Badge>
                  <Badge variant={dish.is_available ? "default" : "destructive"} className="text-[10px]">{dish.is_available ? `${dish.stock_quantity} in stock` : "Out of Stock"}</Badge>
                </div>
                {dish.categories?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {dish.categories.map((c: string) => <Badge key={c} variant="secondary" className="text-[8px]">{c}</Badge>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(dish)}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(dish.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuManagement;
