import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2, Calendar, Star, Flame, CalendarRange, Check, Upload, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";

const emptyDish = {
  name: "",
  description: "",
  selling_price: 0,
  categories: [] as string[],
  dish_type: "veg" as "veg" | "non-veg",
  stock_quantity: 10,
  image_url: "",
  is_available: true
};

const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDish);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Schedule form state
  const [scheduleType, setScheduleType] = useState<"today" | "week">("today");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [scheduleCategory, setScheduleCategory] = useState<string>("");
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: scheduledDishes = [] } = useQuery({
    queryKey: ["scheduled-menu"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_menu").select("*, dishes(name, image_url)").order("schedule_date", { ascending: false });
      return data || [];
    },
  });

  const availableCategories = [...new Set(dishes.flatMap((d: any) => d.categories || d.category || []))] as string[];

  const filteredDishesByCategory = scheduleCategory 
    ? dishes.filter((d: any) => (d.categories || d.category || []).includes(scheduleCategory))
    : dishes;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `dishes/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dish-images')
        .upload(filePath, file);
      
      if (uploadError) {
        // Try public URL fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm({ ...form, image_url: reader.result as string });
          toast.success("Image loaded!");
        };
        reader.readAsDataURL(file);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('dish-images')
        .getPublicUrl(filePath);
      
      setForm({ ...form, image_url: publicUrl });
      toast.success("Image uploaded!");
    } catch (err) {
      // Fallback to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image_url: reader.result as string });
        toast.success("Image loaded (local)!");
      };
      reader.readAsDataURL(file);
    }
    setUploading(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, is_available: form.stock_quantity > 0 && form.is_available };
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

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const scheduleDate = scheduleType === "today" 
        ? format(new Date(), "yyyy-MM-dd")
        : selectedDate;
      
      const payload = {
        dish_id: selectedDishId,
        schedule_date: scheduleDate,
        date: scheduleDate,
        quantity_available: quantity,
        quantity_remaining: quantity,
        preorder_enabled: true
      };
      
      const { error } = await supabase.from("scheduled_menu").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-menu"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-dishes"] });
      setScheduleOpen(false);
      setScheduleType("today");
      setSelectedDishId("");
      setQuantity(10);
      setScheduleCategory("");
      toast.success(scheduleType === "today" ? "Added to Today's Special!" : "Added to Weekly Plan!");
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

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_menu").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-menu"] });
      toast.success("Schedule removed");
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
      image_url: dish.image_url || "",
      is_available: dish.is_available !== false
    } as typeof form);
    setOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase.from("dishes").update({ is_available: isAvailable }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-dishes"] });
      toast.success("Dish visibility updated!");
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold">Menu Items</h2>
        <div className="flex flex-wrap gap-2">
          {/* Schedule Special Button */}
          <Dialog open={scheduleOpen} onOpenChange={(o) => { setScheduleOpen(o); if (!o) { setScheduleType("today"); setSelectedDishId(""); setQuantity(10); setScheduleCategory(""); }}}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/20">
                <Star className="h-4 w-4" /> Add Special
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-xl font-serif font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-orange-500" /> Add Today's / Weekly Special
                </DialogTitle>
              </DialogHeader>
              
              {/* Step 1: Select Type */}
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">1. Select Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setScheduleType("today")}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      scheduleType === "today" 
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-lg shadow-orange-500/20" 
                        : "border-border hover:border-orange-300"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <Flame className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-sm">Today's Special</span>
                    {scheduleType === "today" && <Check className="h-5 w-5 text-orange-500" />}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setScheduleType("week")}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      scheduleType === "week" 
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg shadow-purple-500/20" 
                        : "border-border hover:border-purple-300"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <CalendarRange className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-sm">Weekly Plan</span>
                    {scheduleType === "week" && <Check className="h-5 w-5 text-purple-500" />}
                  </motion.button>
                </div>
              </div>

              {/* Step 2: Date (for weekly) */}
              {scheduleType === "week" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">2. Select Date</Label>
                  <Input 
                    type="date" 
                    value={selectedDate} 
                    min={format(new Date(), "yyyy-MM-dd")}
                    max={format(addDays(new Date(), 6), "yyyy-MM-dd")}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-xl h-12"
                  />
                </motion.div>
              )}

              {/* Step 3: Category */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{scheduleType === "today" ? "2" : "3"}. Select Category</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={scheduleCategory === "" ? "default" : "outline"}
                    onClick={() => setScheduleCategory("")}
                    className="rounded-full"
                  >
                    All
                  </Button>
                  {availableCategories.map((cat: string) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={scheduleCategory === cat ? "default" : "outline"}
                      onClick={() => setScheduleCategory(cat)}
                      className="rounded-full capitalize"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Step 4: Select Dish */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{scheduleType === "today" ? "3" : "4"}. Select Dish</Label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                  {filteredDishesByCategory.map((d: any) => (
                    <motion.div
                      key={d.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDishId(d.id)}
                      className={`p-2 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDishId === d.id
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-background overflow-hidden shrink-0">
                          {d.image_url ? (
                            <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-lg">🍲</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{d.name}</p>
                          <span className={`text-[10px] font-bold ${d.dish_type === 'non-veg' ? 'text-red-500' : 'text-green-500'}`}>
                            {d.dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                          </span>
                        </div>
                        {selectedDishId === d.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Step 5: Quantity */}
              {selectedDishId && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">5. Set Quantity</Label>
                  <div className="flex items-center gap-3 bg-muted rounded-xl h-12 px-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="flex-1 text-center font-bold">{quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </motion.div>
              )}

              <Button 
                onClick={() => scheduleMutation.mutate()} 
                disabled={scheduleMutation.isPending || !selectedDishId}
                className="w-full h-12 rounded-2xl font-bold shadow-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {scheduleMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>Add to {scheduleType === "today" ? "Today's Special" : "Weekly Plan"}</>
                )}
              </Button>
            </DialogContent>
          </Dialog>

          {/* Add Dish Button */}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyDish); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Dish</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Dish" : "Add New Dish"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                
                <div><Label>Selling Price (₹)</Label><Input type="number" value={form.selling_price || ''} onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '');
                  setForm({ ...form, selling_price: val === '' ? 0 : Number(val) });
                }} placeholder="0" /></div>

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

                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0 border-2 border-dashed border-border">
                      {form.image_url ? (
                        <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Upload className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full rounded-xl"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        {uploading ? "Uploading..." : "Upload Image"}
                      </Button>
                      <Input 
                        value={form.image_url} 
                        onChange={(e) => setForm({ ...form, image_url: e.target.value })} 
                        placeholder="Or paste image URL"
                        className="mt-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2">
                    {form.is_available ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">Show in Menu</span>
                  </div>
                  <Button
                    type="button"
                    variant={form.is_available ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, is_available: !form.is_available })}
                    className="rounded-full"
                  >
                    {form.is_available ? "Visible" : "Hidden"}
                  </Button>
                </div>

                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} className="w-full">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Update Dish" : "Add Dish"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scheduled Specials Section */}
      {scheduledDishes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-500" /> Scheduled Specials
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduledDishes.map((item: any) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.dishes?.image_url ? (
                      <img src={item.dishes.image_url} alt={item.dishes?.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">🍲</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.dishes?.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {item.schedule_date === format(new Date(), "yyyy-MM-dd") ? (
                          <span className="text-orange-500 flex items-center gap-1"><Flame className="h-3 w-3" /> Today</span>
                        ) : (
                          <span className="text-purple-500 flex items-center gap-1"><CalendarRange className="h-3 w-3" /> {item.schedule_date}</span>
                        )}
                      </Badge>
                      <span className="text-muted-foreground">{item.quantity_available} left</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteScheduleMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {dishes.map((dish: any) => (
          <Card key={dish.id} className={dish.is_available === false ? "opacity-60" : ""}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {dish.image_url ? <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center">🍽️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{dish.name}</h3>
                  {dish.is_available === false && <Badge variant="secondary" className="text-[10px] bg-muted">Hidden</Badge>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-primary font-medium">₹{dish.selling_price}</span>
                  <Badge variant="outline" className={dish.dish_type === 'veg' ? 'text-green-600' : 'text-red-600'}>{dish.dish_type === 'veg' ? 'VEG' : 'NON-VEG'}</Badge>
                  <Badge variant={dish.is_available && dish.stock_quantity > 0 ? "default" : "destructive"} className="text-[10px]">{dish.is_available && dish.stock_quantity > 0 ? `${dish.stock_quantity} in stock` : "Out of Stock"}</Badge>
                </div>
                {dish.categories?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {dish.categories.map((c: string) => <Badge key={c} variant="secondary" className="text-[8px]">{c}</Badge>)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={dish.is_available ? "text-muted-foreground hover:text-primary" : "text-primary hover:bg-primary/10"} 
                  onClick={() => toggleVisibility.mutate({ id: dish.id, isAvailable: !dish.is_available })}
                  title={dish.is_available ? "Hide dish" : "Show dish"}
                >
                  {dish.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(dish)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(dish.id, dish.name)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-serif font-bold">Delete Dish</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-full h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-full h-11 bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MenuManagement;
