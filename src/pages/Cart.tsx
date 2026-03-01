import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Cart = () => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!user || items.length === 0) return;
    setPlacing(true);
    try {
      // Generate order code
      const { data: codeData } = await supabase.rpc("generate_order_code");
      const code = codeData as string;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ user_id: user.id, order_code: code, total_amount: totalAmount, notes })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        dish_id: item.dishId,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Decrement stock for each dish
      for (const item of items) {
        await supabase.rpc("generate_order_code"); // placeholder - we update stock directly
        await supabase
          .from("dishes")
          .update({ stock_quantity: Math.max(0, item.maxStock - item.quantity) })
          .eq("id", item.dishId);
      }

      // Create notification
      await supabase.from("notifications").insert({
        title: "New Order!",
        message: `Order ${code} placed by customer. ${items.length} item(s), total ₹${totalAmount}`,
        type: "order",
        reference_id: order.id,
      });

      setOrderCode(code);
      clearCart();
      toast.success("Order placed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    }
    setPlacing(false);
  };

  if (orderCode) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-serif font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-6">Your order has been placed successfully</p>
          <Card className="max-w-sm mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Order Code</p>
              <p className="text-3xl font-mono font-bold text-primary">{orderCode}</p>
              <p className="text-xs text-muted-foreground mt-2">Save this code for reference</p>
            </CardContent>
          </Card>
          <div className="flex gap-3 justify-center mt-8">
            <Button onClick={() => navigate("/orders")}>View Orders</Button>
            <Button variant="outline" onClick={() => { setOrderCode(null); navigate("/"); }}>Continue Shopping</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some delicious dishes to get started</p>
        <Button onClick={() => navigate("/")}>Browse Menu</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold mb-8">Your Cart</h1>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <Card key={item.dishId}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-primary font-medium">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.dishId, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.dishId, item.quantity + 1)} disabled={item.quantity >= item.maxStock}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-bold w-20 text-right">₹{(item.price * item.quantity).toFixed(2)}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.dishId)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <Textarea placeholder="Special instructions or notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={placeOrder} disabled={placing}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Place Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cart;
