import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ScheduleManagement = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true });

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["all-scheduled"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_menu").select("*, dishes(name)").order("schedule_date");
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("scheduled_menu").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      setOpen(false);
      setForm({ dish_id: "", schedule_date: "", quantity_available: 10, preorder_enabled: true });
      toast.success("Scheduled!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_menu").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-scheduled"] });
      toast.success("Removed");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Scheduled Menu</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Schedule Dish</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule a Dish</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Dish</Label>
                <Select value={form.dish_id} onValueChange={(v) => setForm({ ...form, dish_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select dish" /></SelectTrigger>
                  <SelectContent>{dishes.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-3">
                <Switch checked={form.preorder_enabled} onCheckedChange={(v) => setForm({ ...form, preorder_enabled: v })} />
                <Label>Enable Pre-orders</Label>
              </div>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.dish_id || !form.schedule_date} className="w-full">
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {scheduled.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{item.dishes?.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{format(new Date(item.schedule_date), "MMM d, yyyy")}</span>
                  <span>·</span>
                  <span>{item.quantity_available} qty</span>
                  {item.preorder_enabled && <Badge className="text-[10px]">Pre-order</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {scheduled.length === 0 && <p className="text-center text-muted-foreground py-8">No scheduled dishes</p>}
      </div>
    </div>
  );
};

export default ScheduleManagement;
