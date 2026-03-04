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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, Loader2, CalendarDays, Edit2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ScheduleManagement = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [form, setForm] = useState({ dish_id: "", schedule_date: format(new Date(), "yyyy-MM-dd"), quantity_available: 10, preorder_enabled: true, schedule_price: 0 });

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0];

  const { data: dishes = [], isLoading: dishesLoading, refetch: refetchDishes } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dishes").select("id, name, selling_price, image_url").order("name");
      if (error) {
        console.error("Dishes fetch error:", error);
        toast.error("Failed to load dishes: " + error.message);
        return [];
      }
      console.log("Loaded dishes:", data?.length);
      return data || [];
    },
    staleTime: 0,
  });

  const { data: scheduled = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ["all-scheduled", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_menu")
        .select("*, dishes(name, image_url, selling_price)")
        .gte("schedule_date", today)
        .lte("schedule_date", nextWeek)
        .order("schedule_date");
      if (error) {
        console.error("Scheduled fetch error:", error);
        return [];
      }
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('manager-schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-scheduled'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const addMutation = useMutation({
    mutationFn: async () => {
      console.log("Scheduling dish:", form);
      const { error } = await supabase.from("scheduled_menu").insert({
        dish_id: form.dish_id,
        schedule_date: form.schedule_date,
        quantity_available: form.quantity_available,
        quantity_remaining: form.quantity_available,
        preorder_enabled: form.preorder_enabled,
        schedule_price: form.schedule_price || null,
      });
      if (error) {
        console.error("Schedule insert error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      setIsAddOpen(false);
      setForm({ dish_id: "", schedule_date: format(new Date(), "yyyy-MM-dd"), quantity_available: 10, preorder_enabled: true, schedule_price: 0 });
      toast.success("Dish scheduled!");
    },
    onError: (err: any) => {
      console.error("Add mutation error:", err);
      toast.error(err.message || "Failed to schedule dish");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_menu").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      toast.success("Schedule removed");
    },
  });

  const scheduledDates = scheduled.map((item: any) => {
    const [y, m, d] = item.schedule_date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  const groupedByDate = scheduled.reduce((acc: any, item: any) => {
    if (!acc[item.schedule_date]) acc[item.schedule_date] = [];
    acc[item.schedule_date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Weekly Schedule</h2>
          <p className="text-muted-foreground">Manage meal pre-orders for the next 7 days</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          if (open) setForm({ ...form, schedule_date: format(selectedDate, "yyyy-MM-dd") });
          if (!open) setForm({ dish_id: "", schedule_date: format(new Date(), "yyyy-MM-dd"), quantity_available: 10, preorder_enabled: true, schedule_price: 0 });
          setIsAddOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add to Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a Dish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.schedule_date} min={today} max={nextWeek} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Select Dish</Label>
                  <Button variant="ghost" size="sm" onClick={() => refetchDishes()} className="h-6 text-xs gap-1">
                    <Loader2 className={`h-3 w-3 ${dishesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mt-1">
                  {dishes.length === 0 && !dishesLoading ? (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-4">No dishes available. Make sure dishes are added to the menu.</p>
                  ) : (
                    dishes.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => setForm({ ...form, dish_id: d.id, schedule_price: d.selling_price })}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${form.dish_id === d.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      >
                        <p className="font-medium text-sm truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">₹{d.selling_price}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Special Price (Optional)</Label>
                  <Input type="number" value={form.schedule_price || ''} onChange={(e) => setForm({ ...form, schedule_price: parseInt(e.target.value) || 0 })} placeholder={dishes.find(d => d.id === form.dish_id)?.selling_price?.toString() || "0"} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Pre-order</Label>
                <Switch checked={form.preorder_enabled} onCheckedChange={(v) => setForm({ ...form, preorder_enabled: v })} />
              </div>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.dish_id} className="w-full">
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Dish"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{ scheduled: scheduledDates }}
              modifiersStyles={{ scheduled: { fontWeight: "bold", color: "hsl(var(--primary))" } }}
              className="rounded-lg"
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Scheduled days</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {Object.keys(groupedByDate).length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-bold">No Schedules</h3>
              <p className="text-sm text-muted-foreground">Add dishes to schedule for pre-orders</p>
            </Card>
          ) : (
            Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]: [string, any]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="font-bold">{format(new Date(date + 'T'), "EEEE, MMM d")}</h3>
                  <Badge variant="outline">{items.length} items</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                          {item.dishes?.image_url ? (
                            <img src={item.dishes.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">🍽️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.dishes?.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-primary">₹{item.schedule_price || item.dishes?.selling_price}</span>
                            <Badge variant={item.preorder_enabled ? "default" : "secondary"} className="text-[10px]">
                              {item.preorder_enabled ? `${item.quantity_available} left` : "Closed"}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;
