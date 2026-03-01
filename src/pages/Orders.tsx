import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Package } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  ready: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const Orders = () => {
  const { user } = useAuth();

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground">No orders yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono font-bold text-primary">{order.order_code}</span>
                    <span className="text-sm text-muted-foreground ml-3">
                      {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <Badge variant="outline" className={statusColors[order.status] || ""}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.dishes?.name} × {item.quantity}</span>
                      <span className="font-medium">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{Number(order.total_amount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
