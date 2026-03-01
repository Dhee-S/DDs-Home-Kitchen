import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const statuses = ["pending", "confirmed", "ready", "completed"];

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  ready: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
};

const OrderManagement = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["all-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, dishes(name)), profiles(name, phone)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Status updated");
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Orders ({orders.length})</h2>
      <div className="space-y-3">
        {orders.map((order: any) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono font-bold text-primary">{order.order_code}</span>
                  <span className="text-sm text-muted-foreground ml-3">{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
                </div>
                <Select value={order.status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium">{order.profiles?.name || "Customer"}</span>
                {order.profiles?.phone && <span className="text-muted-foreground ml-2">{order.profiles.phone}</span>}
              </div>
              <div className="space-y-1 text-sm">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.dishes?.name} × {item.quantity}</span>
                    <span>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>₹{Number(order.total_amount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders yet</p>}
      </div>
    </div>
  );
};

export default OrderManagement;
