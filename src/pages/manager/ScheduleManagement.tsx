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
import { Plus, Trash2, Loader2, CalendarDays, Edit2, Users, CheckCircle2, XCircle, Clock, Package, Filter, Minus, Plus as PlusIcon, Banknote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ScheduleManagement = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingItem, setEditingItem] = useState<any>(null);
  const [approvingRequest, setApprovingRequest] = useState<any>(null);
  const [approvalPrice, setApprovalPrice] = useState<number>(0);
  
  const [form, setForm] = useState({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true, category: "" });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
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

  const parseDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch (e) {
      return new Date(dateStr);
    }
  };

  const pendingDates = specialRequests.filter((r: any) => r.status === 'pending').map((r: any) => parseDate(r.request_date));
  const approvedDates = specialRequests.filter((r: any) => r.status === 'approved').map((r: any) => parseDate(r.request_date));
  const rejectedDates = specialRequests.filter((r: any) => r.status === 'rejected').map((r: any) => parseDate(r.request_date));
  const scheduledDates = scheduled.map((item: any) => parseDate(item.schedule_date));

  useEffect(() => {
    const channel = supabase
      .channel('manager-schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-scheduled'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-special-requests'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

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

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status, price, dishName, userId }: { id: string, status: string, price?: number, dishName?: string, userId?: string }) => {
      const updates: any = { status };
      if (price !== undefined) updates.price = price;
      
      const { error } = await (supabase.from("special_requests" as any).update(updates).eq("id", id) as any);
      if (error) throw error;

      if (status === "approved" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Request Approved! 💳",
          message: `Your request for "${dishName}" is approved at ₹${price}. Add it to cart now!`,
          type: "order",
          reference_id: id
        } as any);
      }
      
      if (status === "completed" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Request Completed! 🎉",
          message: `Your special request for "${dishName}" has been completed.`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      setIsApproveOpen(false);
      toast.success("Request status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: 'schedule' | 'request' }) => {
      if (type === 'schedule') {
        // Try to delete first
        const { error: deleteError } = await supabase.from("scheduled_menu").delete().eq("id", id);
        
        if (deleteError) {
          if (deleteError.message?.includes("foreign key") || deleteError.code === "23503") {
            // Has orders - disable preorder instead
            const { error } = await supabase.from("scheduled_menu").update({ preorder_enabled: false, quantity_available: 0 }).eq("id", id);
            if (error) throw error;
            return { hidden: true };
          }
          throw deleteError;
        }
        return { hidden: false };
      } else {
        const { error } = await supabase.from("special_requests" as any).delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      if (data?.hidden) {
        toast.success("Schedule has orders - pre-order disabled");
      } else {
        toast.success("Item removed successfully");
      }
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

  const filteredScheduled = selectedDate
    ? scheduled.filter((s: any) => s.schedule_date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  const filteredRequests = selectedDate
    ? specialRequests.filter((r: any) => r.request_date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  const placedRequests = filteredRequests.filter((r: any) => r.status === 'pending');
  const approvedRequests = filteredRequests.filter((r: any) => r.status === 'approved');
  const rejectedRequests = filteredRequests.filter((r: any) => r.status === 'rejected');
  const doneRequests = filteredRequests.filter((r: any) => r.status === 'completed');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold tracking-tight">Schedule Management</h2>
          <p className="text-muted-foreground">Manage kitchen timeline and user requests.</p>
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
              <Plus className="h-5 w-5" /> Schedule Dish
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif font-bold">Plan a Meal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">1. Date</Label>
                <Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} className="rounded-xl h-12" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">2. Select Dish</Label>
                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto p-1">
                  {dishes.map((d: any) => (
                    <div
                      key={d.id}
                      onClick={() => setForm({ ...form, dish_id: d.id })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.dish_id === d.id ? "border-primary bg-primary/10" : "border-transparent bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <p className="font-bold text-xs truncate">{d.name}</p>
                      <span className="text-[10px] text-muted-foreground">₹{d.selling_price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Portions</Label>
                  <Input type="number" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: Number(e.target.value) })} className="rounded-xl h-12" />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl h-12 border">
                    <span className="text-xs font-bold">Pre-order</span>
                    <Switch checked={form.preorder_enabled} onCheckedChange={(v) => setForm({ ...form, preorder_enabled: v })} />
                  </div>
                </div>
              </div>
              
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.dish_id} className="h-14 rounded-2xl text-lg font-bold">
                {addMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Schedule Now"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
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
                  pending: { border: "2px solid hsl(33.3 90% 50%)", borderRadius: "12px" },
                  approved: { border: "2px solid hsl(142 76% 36%)", borderRadius: "12px" },
                  rejected: { border: "2px solid hsl(0 84% 60%)", borderRadius: "12px" }
                }}
                className="rounded-2xl border shadow-inner p-2 mx-auto"
              />
              <div className="grid grid-cols-2 gap-2 mt-4 px-2">
                <div className="flex items-center gap-2 text-[10px] font-bold"><div className="h-2 w-2 rounded-full bg-primary" /> Scheduled</div>
                <div className="flex items-center gap-2 text-[10px] font-bold"><div className="h-2 w-2 rounded-full bg-orange-500" /> Pending Req</div>
                <div className="flex items-center gap-2 text-[10px] font-bold"><div className="h-2 w-2 rounded-full bg-green-500" /> Approved</div>
                <div className="flex items-center gap-2 text-[10px] font-bold"><div className="h-2 w-2 rounded-full bg-red-500" /> Rejected</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Today's Plan
              {selectedDate && <span className="text-muted-foreground text-sm font-medium">({format(selectedDate, "MMM d")})</span>}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredScheduled.map((item: any) => (
                <Card key={item.id} className="glass-card border-0 shadow-lg rounded-[2rem] overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0">
                      {item.dishes?.image_url && <img src={item.dishes.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{item.dishes?.name}</h4>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity_available} | {item.preorder_enabled ? 'Pre-order' : 'Immediate'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(item.id, 'schedule', item.dishes?.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filteredScheduled.length === 0 && <p className="text-xs italic text-muted-foreground col-span-full py-4 px-6 bg-muted/20 rounded-2xl">No items scheduled for this date.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold">User Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pending Requests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-widest"><Clock className="h-4 w-4" /> Pending</div>
                {placedRequests.map((req: any) => (
                  <Card key={req.id} className="shadow-md rounded-2xl border-l-4 border-l-orange-500">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm leading-tight">{req.dish_name}</span>
                        <Badge variant="outline" className="text-[8px] uppercase">{req.request_time}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Qty: {req.quantity} | User: {req.profiles?.email.split('@')[0]}</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8 rounded-full text-[10px] bg-green-500" onClick={() => { setApprovingRequest(req); setIsApproveOpen(true); }}>Approve</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 rounded-full text-[10px] text-red-500" onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'rejected' })}>Reject</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Approved Requests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 font-black text-xs uppercase tracking-widest"><CheckCircle2 className="h-4 w-4" /> Approved</div>
                {approvedRequests.map((req: any) => (
                  <Card key={req.id} className="shadow-md rounded-2xl border-l-4 border-l-green-500 bg-green-50/50">
                    <CardContent className="p-3">
                      <p className="font-bold text-sm">{req.dish_name}</p>
                      <p className="text-[10px] font-bold text-primary">Price: ₹{req.price}</p>
                      <Button size="sm" className="w-full mt-2 h-7 rounded-full text-[10px]" onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'completed', dishName: req.dish_name, userId: req.user_id })}>Mark Done</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Completed Requests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest"><Package className="h-4 w-4" /> Completed</div>
                {doneRequests.map((req: any) => (
                  <Card key={req.id} className="shadow-sm rounded-2xl opacity-60">
                    <CardContent className="p-3">
                      <p className="font-bold text-xs">{req.dish_name}</p>
                      <p className="text-[10px]">₹{req.price}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Rejected Requests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest"><XCircle className="h-4 w-4" /> Rejected</div>
                {rejectedRequests.map((req: any) => (
                  <Card key={req.id} className="shadow-sm rounded-2xl opacity-60">
                    <CardContent className="p-3">
                      <p className="font-bold text-xs">{req.dish_name}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => handleDeleteClick(req.id, 'request', req.dish_name)}><Trash2 className="h-3 w-3" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Approval Dialog - Set Price */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Special Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-2xl">
              <p className="text-sm font-bold">{approvingRequest?.dish_name}</p>
              <p className="text-xs text-muted-foreground">Quantity: {approvingRequest?.quantity}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Set Price for User (₹)</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="number" 
                  value={approvalPrice || ''} 
                  onChange={(e) => setApprovalPrice(Number(e.target.value))} 
                  className="pl-10 h-12 rounded-xl text-lg font-bold"
                  placeholder="0"
                />
              </div>
            </div>
            <Button 
              className="w-full h-12 rounded-xl bg-green-600 font-bold"
              disabled={!approvalPrice}
              onClick={() => updateRequestStatus.mutate({ 
                id: approvingRequest.id, 
                status: 'approved', 
                price: approvalPrice,
                dishName: approvingRequest.dish_name,
                userId: approvingRequest.user_id
              })}
            >
              Confirm Approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove "{deleteTarget?.name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-full bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduleManagement;
