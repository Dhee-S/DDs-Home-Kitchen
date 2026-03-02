import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Loader2, CalendarDays, Edit2, Users, CheckCircle2, XCircle, Clock, Package, Filter, Minus, Plus as PlusIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ScheduleManagement = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [form, setForm] = useState({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true, category: "" });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [requestForm, setRequestForm] = useState({ dish_name: "", quantity: 1, request_time: "Evening", occasion: "", notes: "" });
  
  // Custom delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'schedule' | 'request'; name: string } | null>(null);

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("id, name, image_url, categories, category, dish_type").order("name");
      return data || [];
    },
  });

  const availableCategories = [...new Set(dishes.flatMap((d: any) => d.categories || d.category || []))] as string[];

  const filteredDishesByCategory = categoryFilter === "all" 
    ? dishes 
    : dishes.filter((d: any) => {
        const cats = d.categories || d.category || [];
        return cats.includes(categoryFilter);
      });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["all-scheduled"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_menu").select("*, dishes(name, image_url)").order("schedule_date");
      return data || [];
    },
  });

  const { data: specialRequests = [] } = useQuery({
    queryKey: ["all-special-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("special_requests" as any)
        .select("*, profiles(email)")
        .order("request_date", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const requestedDates = specialRequests.map((r: any) => new Date(r.request_date));
  const pendingDates = specialRequests.filter((r: any) => r.status === 'pending').map((r: any) => new Date(r.request_date));
  const approvedDates = specialRequests.filter((r: any) => r.status === 'approved').map((r: any) => new Date(r.request_date));
  const rejectedDates = specialRequests.filter((r: any) => r.status === 'rejected').map((r: any) => new Date(r.request_date));

  useEffect(() => {
    const channel = supabase
      .channel('manager-schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-scheduled'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-dishes'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-special-requests'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const requestStatuses = ["pending", "approved", "rejected"];

  const addMutation = useMutation({
    mutationFn: async () => {
      const { category, ...rest } = form;
      const payload = {
        ...rest,
        date: form.schedule_date,
        quantity_remaining: form.quantity_available
      };
      const { error } = await supabase.from("scheduled_menu").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      setIsAddOpen(false);
      setForm({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true, category: "" });
      toast.success("Dish scheduled successfully!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("scheduled_menu")
        .update({
          dish_id: payload.dish_id,
          schedule_date: payload.schedule_date,
          date: payload.schedule_date,
          quantity_available: payload.quantity_available,
          preorder_enabled: payload.preorder_enabled
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      setIsEditOpen(false);
      toast.success("Schedule updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: 'schedule' | 'request' }) => {
      if (type === 'schedule') {
        const { error } = await supabase.from("scheduled_menu").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("special_requests" as any).delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      toast.success("Item removed successfully");
    },
  });

  const handleDeleteClick = (id: string, type: 'schedule' | 'request', name: string) => {
    setDeleteTarget({ id, type, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id, type: deleteTarget.type });
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status, quantity, dishName, userId, requestDate }: { id: string, status: string, quantity?: number, dishName?: string, userId?: string, requestDate?: string }) => {
      const { error } = await (supabase.from("special_requests" as any).update({ status }).eq("id", id) as any);
      if (error) throw error;

      // When completed, notify user and move to orders
      if (status === "completed" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Order Completed! 🎉",
          message: `Your special request for "${dishName}" has been completed. Enjoy your meal!`,
          type: "order",
          reference_id: id
        } as any);
      }

      // When approved, notify user to complete payment
      if (status === "approved" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Request Approved! 💳",
          message: `Your special request for "${dishName}" has been approved. Please complete your payment to confirm the order.`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-dishes"] });
      toast.success("Request status updated");
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await (supabase.from("special_requests" as any).update({
        dish_name: payload.dish_name,
        quantity: payload.quantity,
        request_time: payload.request_time,
        occasion: payload.occasion,
        notes: payload.notes,
        status: payload.status
      }).eq("id", payload.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      setIsEditRequestOpen(false);
      toast.success("Request updated");
    },
  });

  const scheduledDates = scheduled.map((item: any) => new Date(item.schedule_date));

  const filteredScheduled = selectedDate
    ? scheduled.filter((s: any) => s.schedule_date === format(selectedDate, "yyyy-MM-dd"))
    : scheduled;

  const filteredRequests = selectedDate
    ? specialRequests.filter((r: any) => r.request_date === format(selectedDate, "yyyy-MM-dd"))
    : specialRequests;

  const placedRequests = filteredRequests.filter((r: any) => r.status === 'pending');
  const confirmedRequests = filteredRequests.filter((r: any) => r.status === 'approved');
  const rejectedRequests = filteredRequests.filter((r: any) => r.status === 'rejected');
  const doneRequests = filteredRequests.filter((r: any) => r.status === 'completed');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Schedule Management</h2>
          <p className="text-muted-foreground">Manage your kitchen's timeline and custom requests.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => { 
          if (open && selectedDate) {
            setForm({ ...form, schedule_date: format(selectedDate, "yyyy-MM-dd") });
          }
          if (!open) { 
            setForm({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true, category: "" }); 
            setCategoryFilter("all"); 
          } 
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
              <Plus className="h-5 w-5" /> Schedule New Dish
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif font-bold">Plan a Meal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Step 1: Date Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">1. Select Date</Label>
                <Input 
                  type="date" 
                  value={form.schedule_date} 
                  onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} 
                  className="rounded-xl h-12" 
                />
              </div>

              {/* Step 2: Category Selection */}
              {form.schedule_date && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">2. Select Category</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      variant={categoryFilter === "all" ? "default" : "outline"} 
                      onClick={() => setCategoryFilter("all")}
                      className="rounded-full"
                    >
                      All
                    </Button>
                    {availableCategories.map((cat: string) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={categoryFilter === cat ? "default" : "outline"}
                        onClick={() => setCategoryFilter(cat)}
                        className="rounded-full capitalize"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Dish Selection */}
              {form.schedule_date && categoryFilter && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">3. Select Dish</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
                    {filteredDishesByCategory.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => setForm({ ...form, dish_id: d.id })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          form.dish_id === d.id 
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
                            <p className="font-medium text-sm truncate">{d.name}</p>
                            <span className={`text-[10px] font-bold ${d.dish_type === 'non-veg' ? 'text-red-500' : 'text-green-500'}`}>
                              {d.dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Quantity & Preorder */}
              {form.dish_id && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Portions</Label>
                      <div className="flex items-center gap-2 bg-muted rounded-xl h-12 px-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm({ ...form, quantity_available: Math.max(1, form.quantity_available - 1) })}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="flex-1 text-center font-bold">{form.quantity_available}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm({ ...form, quantity_available: form.quantity_available + 1 })}>
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">&nbsp;</Label>
                      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50 h-12">
                        <span className="text-sm font-bold">Pre-orders</span>
                        <Switch checked={form.preorder_enabled} onCheckedChange={(v) => setForm({ ...form, preorder_enabled: v })} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.dish_id || !form.schedule_date} className="h-14 rounded-2xl text-lg font-bold">
                    {addMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Schedule Dish"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
        {/* Calendar Sidebar */}
        <div className="space-y-6">
          <Card className="glass-card rounded-[2.5rem] border-0 shadow-xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Main Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ 
                  scheduled: scheduledDates, 
                  pending: pendingDates,
                  approved: approvedDates,
                  rejected: rejectedDates
                }}
                modifiersStyles={{
                  scheduled: { fontWeight: "black", color: "hsl(var(--primary))", background: "hsl(var(--primary)/0.1)" },
                  pending: { border: "2px solid hsl(33.3 90% 50%)", borderRadius: "12px", background: "hsl(33.3 90% 50% / 0.1)" },
                  approved: { border: "2px solid hsl(142 76% 36%)", borderRadius: "12px", background: "hsl(142 76% 36% / 0.1)" },
                  rejected: { border: "2px solid hsl(0 84% 60%)", borderRadius: "12px", background: "hsl(0 84% 60% / 0.1)" }
                }}
                className="rounded-2xl border shadow-inner bg-background/40 backdrop-blur-sm p-4"
              />
            </CardContent>
          </Card>


        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {/* Scheduled Items for Selected Day */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                Today's Plan
                {selectedDate && <span className="text-muted-foreground text-sm font-medium">({format(selectedDate, "MMM d, yyyy")})</span>}
              </h3>
              <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20">{filteredScheduled.length} Items</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredScheduled.map((item: any) => (
                <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="glass-card border-0 shadow-lg group hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden shrink-0 border border-white/20">
                        {item.dishes?.image_url ? (
                          <img src={item.dishes.image_url} alt={item.dishes?.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl">🍲</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg leading-tight truncate">{item.dishes?.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">📦 {item.quantity_available}</span>
                          {item.preorder_enabled && <Badge variant="secondary" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20">PRE-ORDER</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" onClick={() => { setEditingItem(item); setIsEditOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteClick(item.id, 'schedule', item.dishes?.name || 'this item')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredScheduled.length === 0 && (
                <div className="col-span-full py-12 text-center glass-card rounded-[2.5rem] border-2 border-dashed border-border/40">
                  <p className="text-muted-foreground italic">No production scheduled for this date.</p>
                </div>
              )}
            </div>
          </section>

          {/* Special Requests - 4 Columns */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-3">
              Special Requests
              <Badge variant="secondary" className="rounded-full bg-orange-500 text-white border-0">{filteredRequests.length}</Badge>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pending Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 text-orange-600">
                  <Clock className="h-5 w-5" />
                  <h3 className="font-bold">Pending</h3>
                  <Badge variant="secondary" className="ml-auto">{placedRequests.length}</Badge>
                </div>
                <div className="space-y-3">
                  {placedRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No pending requests</div>
                  ) : (
                    placedRequests.map((req: any) => (
                      <Card key={req.id} className="overflow-hidden border-0 glass-card shadow-lg rounded-[1.5rem]">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{req.dish_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(req.id, 'request', req.dish_name)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">Qty: {req.quantity} | {req.request_time}</div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-8 rounded-full bg-green-500" onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'approved', dishName: req.dish_name, userId: req.user_id })}>Approve</Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8 rounded-full" onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'rejected', dishName: req.dish_name, userId: req.user_id })}>Reject</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Approved Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="font-bold">Approved</h3>
                  <Badge variant="secondary" className="ml-auto">{confirmedRequests.length}</Badge>
                </div>
                <div className="space-y-3">
                  {confirmedRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No approved requests</div>
                  ) : (
                    confirmedRequests.map((req: any) => (
                      <Card key={req.id} className="overflow-hidden border-0 glass-card shadow-lg rounded-[1.5rem]">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{req.dish_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(req.id, 'request', req.dish_name)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">Qty: {req.quantity} | {req.request_time}</div>
                          <Button size="sm" className="w-full h-8 rounded-full bg-green-500" onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'completed', quantity: req.quantity, dishName: req.dish_name, userId: req.user_id })}>Mark Completed</Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Completed Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-600">
                  <Package className="h-5 w-5" />
                  <h3 className="font-bold">Completed</h3>
                  <Badge variant="secondary" className="ml-auto">{doneRequests.length}</Badge>
                </div>
                <div className="space-y-3">
                  {doneRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No completed requests</div>
                  ) : (
                    doneRequests.map((req: any) => (
                      <Card key={req.id} className="overflow-hidden border-0 glass-card shadow-lg rounded-[1.5rem] opacity-75">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{req.dish_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(req.id, 'request', req.dish_name)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">Qty: {req.quantity} | {req.request_time}</div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Rejected Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-bold">Rejected</h3>
                  <Badge variant="secondary" className="ml-auto">{rejectedRequests.length}</Badge>
                </div>
                <div className="space-y-3">
                  {rejectedRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No rejected requests</div>
                  ) : (
                    rejectedRequests.map((req: any) => (
                      <Card key={req.id} className="overflow-hidden border-0 glass-card shadow-lg rounded-[1.5rem] opacity-75">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{req.dish_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(req.id, 'request', req.dish_name)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">Qty: {req.quantity} | {req.request_time}</div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-bold">Edit Schedule</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Dish</Label>
                <Select defaultValue={editingItem.dish_id} onValueChange={(v) => setEditingItem({ ...editingItem, dish_id: v })}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {dishes.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Date</Label>
                  <Input type="date" value={editingItem.schedule_date} onChange={(e) => setEditingItem({ ...editingItem, schedule_date: e.target.value })} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</Label>
                  <Input type="number" value={editingItem.quantity_available} onChange={(e) => setEditingItem({ ...editingItem, quantity_available: Number(e.target.value) })} className="rounded-xl h-12" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl">
                <Label className="font-bold">Enable Pre-orders</Label>
                <Switch checked={editingItem.preorder_enabled} onCheckedChange={(v) => setEditingItem({ ...editingItem, preorder_enabled: v })} />
              </div>
              <Button onClick={() => updateMutation.mutate(editingItem)} className="h-14 rounded-2xl text-lg font-bold">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Request Dialog */}
      <Dialog open={isEditRequestOpen} onOpenChange={setIsEditRequestOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-bold">Edit Request</DialogTitle>
          </DialogHeader>
          {editingRequest && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Dish Name</Label>
                <Input 
                  value={requestForm.dish_name} 
                  onChange={(e) => setRequestForm({ ...requestForm, dish_name: e.target.value })} 
                  className="rounded-xl h-12" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</Label>
                  <Input 
                    type="number" 
                    value={requestForm.quantity} 
                    onChange={(e) => setRequestForm({ ...requestForm, quantity: Number(e.target.value) })} 
                    className="rounded-xl h-12" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Timing</Label>
                  <Select value={requestForm.request_time} onValueChange={(v) => setRequestForm({ ...requestForm, request_time: v })}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Occasion</Label>
                <Input 
                  value={requestForm.occasion} 
                  onChange={(e) => setRequestForm({ ...requestForm, occasion: e.target.value })} 
                  className="rounded-xl h-12" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Notes</Label>
                <Input 
                  value={requestForm.notes} 
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} 
                  className="rounded-xl h-12" 
                />
              </div>
              <Button 
                onClick={() => updateRequestMutation.mutate({ ...editingRequest, ...requestForm })} 
                className="h-14 rounded-2xl text-lg font-bold"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-serif font-bold">Confirm Delete</AlertDialogTitle>
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

export default ScheduleManagement;
