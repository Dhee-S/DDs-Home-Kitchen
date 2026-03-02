import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Package, ShoppingBag, Sparkles, Phone, CreditCard, CheckCircle, Clock, Wallet } from "lucide-react";
import OrderManagement from "./manager/OrderManagement";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PAYMENT_NUMBER = "7904935160";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  ready: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const paymentColors: Record<string, string> = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-200",
  paid: "bg-green-500/10 text-green-600 border-green-200",
  failed: "bg-red-500/10 text-red-600 border-red-200",
};

const Orders = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, dishes(name, image_url))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      // @ts-ignore - payment_status column may not be in types
      const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      toast.success("Payment status updated!");
      setShowPaymentDialog(false);
    },
  });

  const openPaymentDialog = (order: any) => {
    setSelectedOrder(order);
    setShowPaymentDialog(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
          <ShoppingBag className="h-3 w-3" /> {role === 'manager' ? "Kitchen Fulfillment" : "My Cravings"}
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter mb-4">
          {role === 'manager' ? "Order Management" : "My Orders"}
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
          {role === 'manager'
            ? "Track and manage all incoming orders to ensure timely delivery."
            : "Review your past delights and track current orders from our kitchen."}
        </p>
      </div>

      {role === 'manager' ? (
        <div className="glass-card rounded-[3rem] p-8 border border-white/10 shadow-2xl">
          <OrderManagement />
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-border/50">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground">No orders yet</h3>
              <p className="text-sm text-muted-foreground/60 mt-1">Your delicious journey starts with your first order!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order: any) => (
                <Card key={order.id} className="border-0 shadow-xl glass-card rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-primary text-lg">{order.order_code}</span>
                            <Badge className={`rounded-xl px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusColors[order.status] || ""}`}>
                              {order.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {format(new Date(order.created_at), "MMMM d, yyyy · h:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-foreground">₹{Number(order.total_amount).toFixed(2)}</span>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <Badge className={`rounded-xl px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${paymentColors[order.payment_status || 'pending'] || ""}`}>
                            {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'failed' ? 'Failed' : 'Payment Pending'}
                          </Badge>
                        </div>
                        {order.payment_status !== 'paid' && (
                          <Button 
                            size="sm" 
                            className="mt-2 rounded-full h-8 bg-green-500 hover:bg-green-600 gap-1"
                            onClick={() => openPaymentDialog(order)}
                          >
                            <Wallet className="h-3 w-3" /> Pay Now
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 bg-muted/30 p-5 rounded-2xl border border-border/40">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm group/item">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-background overflow-hidden border border-border/50">
                              {item.dishes?.image_url ? <img src={item.dishes.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs">🥘</div>}
                            </div>
                            <span className="font-bold">{item.dishes?.name}</span>
                            <span className="text-muted-foreground text-xs bg-muted/50 px-2 py-0.5 rounded-lg">×{item.quantity}</span>
                          </div>
                          <span className="font-mono font-bold">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-center">Complete Payment</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-2xl">
                <p className="text-sm text-muted-foreground">Order Amount</p>
                <p className="text-3xl font-black text-primary">₹{Number(selectedOrder.total_amount).toFixed(2)}</p>
              </div>
              
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mb-1">Pay to this number</p>
                <p className="text-center text-2xl font-mono font-black text-primary">{PAYMENT_NUMBER}</p>
              </div>

              <Button 
                onClick={() => updatePaymentMutation.mutate({ orderId: selectedOrder.id, status: 'paid' })}
                className="w-full h-12 rounded-full bg-green-500 hover:bg-green-600 gap-2"
              >
                <CheckCircle className="h-5 w-5" /> I've Made the Payment
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="w-full h-10 rounded-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
