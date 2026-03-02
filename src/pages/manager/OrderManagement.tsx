import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Clock, Package, CreditCard, Wallet } from "lucide-react";

const statuses = ["pending", "confirmed", "completed"];
const paymentStatuses = ["pending", "paid", "failed"];

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-200",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-200",
  completed: "bg-green-500/10 text-green-600 border-green-200",
};

const paymentColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-200",
  paid: "bg-green-500/10 text-green-600 border-green-200",
  failed: "bg-red-500/10 text-red-600 border-red-200",
};

const OrderManagement = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["all-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, dishes(name)), profiles(name, phone, email)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userEmail }: { id: string; status: string; userEmail?: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "completed" && userEmail) {
        await supabase.from("notifications").insert({
          title: "Order Delivered - Review Please!",
          message: `Your order has been delivered. Please take a moment to rate your experience.`,
          type: "review",
          reference_id: id
        } as any);
        
        await supabase.from("notifications").insert({
          title: "Order Completed",
          message: `Order marked as completed. Customer should receive a review request.`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Status updated");
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentStatus, userEmail }: { id: string; paymentStatus: string; userEmail?: string }) => {
      // @ts-ignore - payment_status column may not be in types
      const updates: any = { payment_status: paymentStatus };
      
      // Auto-confirm order when payment is marked as paid
      if (paymentStatus === 'paid') {
        updates.status = 'confirmed';
      }
      
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;

      if (paymentStatus === 'paid' && userEmail) {
        await supabase.from("notifications").insert({
          title: "Payment Verified!",
          message: `Your payment has been verified. Your order is being prepared!`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Payment status updated");
    },
  });

  const pendingOrders = orders.filter((o: any) => o.status === "pending");
  const confirmedOrders = orders.filter((o: any) => o.status === "confirmed");
  const completedOrders = orders.filter((o: any) => o.status === "completed");

  const OrderCard = ({ order }: { order: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-mono font-bold text-primary">{order.order_code}</span>
            <span className="text-sm text-muted-foreground ml-3 block mt-1">{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
          </div>
          <Select value={order.status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v, userEmail: order.profiles?.email })}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Payment Status */}
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Payment:</span>
          <Select 
            value={order.payment_status || 'pending'} 
            onValueChange={(v) => updatePaymentStatus.mutate({ id: order.id, paymentStatus: v, userEmail: order.profiles?.email })}
          >
            <SelectTrigger className={`w-24 h-7 text-xs ${paymentColors[order.payment_status || 'pending']}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'paid' ? '✓ Paid' : s === 'pending' ? '⏳ Pending' : '✗ Failed'}
                </SelectItem>
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
  );

  const Column = ({ title, icon: Icon, orders, color }: { title: string, icon: any, orders: any[], color: string }) => (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
        <h3 className="font-bold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{orders.length}</Badge>
      </div>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">No orders</div>
        ) : (
          orders.map((order: any) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Orders ({orders.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Column title="Pending" icon={Clock} orders={pendingOrders} color="bg-orange-500/10 text-orange-600" />
        <Column title="Confirmed" icon={CheckCircle2} orders={confirmedOrders} color="bg-blue-500/10 text-blue-600" />
        <Column title="Completed" icon={Package} orders={completedOrders} color="bg-green-500/10 text-green-600" />
      </div>
    </div>
  );
};

export default OrderManagement;
