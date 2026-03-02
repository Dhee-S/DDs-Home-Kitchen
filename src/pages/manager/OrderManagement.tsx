import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Clock, Package, CreditCard, Wallet, ChefHat } from "lucide-react";

const statuses = ["pending", "confirmed", "ready", "completed"];
const paymentStatuses = ["pending", "paid", "failed"];

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-200",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-200",
  ready: "bg-purple-500/10 text-purple-600 border-purple-200",
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
    mutationFn: async ({ id, status, userEmail, userId }: { id: string; status: string; userEmail?: string; userId?: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "completed" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Order Delivered! 🎉",
          message: `Your order has been marked as completed. Enjoy your meal!`,
          type: "order",
          reference_id: id
        } as any);
      }
      
      if (status === "ready" && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Order Ready! 🥘",
          message: `Your order is ready for pickup/delivery. Get it while it's hot!`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Order status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentStatus, userEmail, userId }: { id: string; paymentStatus: string; userEmail?: string; userId?: string }) => {
      const updates: any = { payment_status: paymentStatus };
      
      if (paymentStatus === 'paid') {
        updates.status = 'confirmed';
      }
      
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;

      if (paymentStatus === 'paid' && userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Payment Verified! ✅",
          message: `Your payment has been verified. Your order is now confirmed and being prepared!`,
          type: "order",
          reference_id: id
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Payment verified and order confirmed!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update payment status");
    },
  });

  const pendingOrders = orders.filter((o: any) => o.status === "pending");
  const activeOrders = orders.filter((o: any) => o.status === "confirmed" || o.status === "ready");
  const completedOrders = orders.filter((o: any) => o.status === "completed");

  const OrderCard = ({ order }: { order: any }) => (
    <Card className="hover:shadow-md transition-shadow overflow-hidden border-l-4" style={{ borderLeftColor: order.status === 'ready' ? '#a855f7' : order.status === 'confirmed' ? '#3b82f6' : '#f97316' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-mono font-bold text-primary">{order.order_code}</span>
            <span className="text-xs text-muted-foreground ml-3 block mt-1">{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
          </div>
          <Select value={order.status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v, userEmail: order.profiles?.email, userId: order.user_id })}>
            <SelectTrigger className="w-32 h-8 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-medium capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Payment:</span>
          <Select 
            value={order.payment_status || 'pending'} 
            onValueChange={(v) => updatePaymentStatus.mutate({ id: order.id, paymentStatus: v, userEmail: order.profiles?.email, userId: order.user_id })}
          >
            <SelectTrigger className={`w-28 h-7 text-[10px] font-bold ${paymentColors[order.payment_status || 'pending']}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentStatuses.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s === 'paid' ? '✓ Paid' : s === 'pending' ? '⏳ Pending' : '✗ Failed'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm mb-2 p-2 bg-muted/30 rounded-lg">
          <span className="font-bold text-foreground">{order.profiles?.name || "Customer"}</span>
          {order.profiles?.phone && <span className="text-muted-foreground ml-2 text-xs">{order.profiles.phone}</span>}
        </div>
        
        <div className="space-y-1 text-xs mb-3">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between font-medium">
              <span>{item.dishes?.name} × {item.quantity}</span>
              <span>₹{(item.unit_price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        
        <div className="border-t border-dashed mt-2 pt-2 flex justify-between font-black text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="text-primary">₹{Number(order.total_amount).toFixed(0)}</span>
        </div>
      </CardContent>
    </Card>
  );

  const Column = ({ title, icon: Icon, orders, color }: { title: string, icon: any, orders: any[], color: string }) => (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${color}`}>
        <Icon className="h-5 w-5" />
        <h3 className="font-black uppercase tracking-widest text-xs">{title}</h3>
        <Badge variant="secondary" className="ml-auto rounded-full font-black">{orders.length}</Badge>
      </div>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs border-2 border-dashed rounded-[2rem] bg-muted/10 opacity-50">
            No orders in {title}
          </div>
        ) : (
          orders.map((order: any) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[2rem]" />)}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-black tracking-tight">Active Kitchen Orders</h2>
        <Badge variant="outline" className="rounded-full px-4 py-1">{orders.length} Total</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Column title="Pending & New" icon={Clock} orders={pendingOrders} color="bg-orange-500/5 text-orange-600 border-orange-200/50" />
        <Column title="In Kitchen / Ready" icon={ChefHat} orders={activeOrders} color="bg-blue-500/5 text-blue-600 border-blue-200/50" />
        <Column title="Completed" icon={CheckCircle2} orders={completedOrders} color="bg-green-500/5 text-green-600 border-green-200/50" />
      </div>
    </div>
  );
};

export default OrderManagement;
