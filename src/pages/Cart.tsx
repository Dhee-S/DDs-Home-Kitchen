import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, Loader2, ShoppingBag, ArrowLeft, ChefHat, Phone, CreditCard, CheckCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const PAYMENT_NUMBER = "7904935160";

const Cart = () => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  const placeOrder = async () => {
    if (!user || items.length === 0) return;
    setPlacing(true);
    try {
      const orderItems = items.map((item) => ({
        dishId: item.dishId,
        quantity: item.quantity,
        price: item.price,
        scheduled_menu_id: item.scheduledMenuId || null
      }));

      // @ts-ignore - Supabase RPC types incomplete
      const { data: orderData, error: orderError } = await supabase.rpc("place_order", {
        _user_id: user.id,
        _total_amount: totalAmount,
        _notes: notes,
        _items: orderItems
      });

      if (orderError) throw orderError;

      // Ensure we get the order code correctly
      const code = typeof orderData === 'object' && orderData !== null ? (orderData as any).order_code : orderData;

      if (!code) throw new Error("Could not generate order code");

      setOrderCode(code);
      clearCart();
      setShowPaymentInfo(true);
      toast.success("Order placed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    }
    setPlacing(false);
  };

  if (orderCode) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-green-500/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full relative z-10 space-y-6">
          <Card className="glass-card border-0 shadow-2xl rounded-[3rem] text-center p-8 sm:p-10">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-3xl font-serif font-black tracking-tighter mb-4">Deliciously Confirmed!</h1>
            <p className="text-muted-foreground font-medium mb-8 leading-relaxed text-sm">
              Your order is being prepared with love. <br /> Get ready for a treat!
            </p>

            <div className="bg-muted/40 p-6 rounded-[2rem] border border-border/50 mb-8 shadow-inner">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-2">Order Code</p>
              <p className="text-4xl font-mono font-black text-primary tracking-widest leading-none">{orderCode}</p>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold">* Keep this code safe for pickup</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate("/orders")} className="h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                Track My Cravings
              </Button>
              <Button variant="ghost" onClick={() => { setOrderCode(null); setShowPaymentInfo(false); navigate("/"); }} className="h-12 rounded-xl text-muted-foreground hover:text-foreground">
                Back to Menu
              </Button>
            </div>
          </Card>

          <AnimatePresence>
            {showPaymentInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="h-10 w-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-serif font-black">Complete Payment</h2>
                    </div>
                    
                    <p className="text-center text-sm text-muted-foreground mb-6">Please pay via GPay or PhonePe</p>
                    
                    <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-blue-100 mb-6">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-2xl">📱</span>
                        </div>
                        <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                          <Phone className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1 uppercase font-black">Pay to this number</p>
                        <p className="text-3xl font-mono font-black text-primary">{PAYMENT_NUMBER}</p>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setShowPaymentInfo(false);
                        toast.info("Payment notification sent!");
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-black shadow-lg bg-green-500 hover:bg-green-600 gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      I've Made the Payment
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-32 h-32 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          </div>
          <h2 className="text-4xl font-serif font-black tracking-tighter mb-4">Your Plate is Empty</h2>
          <p className="text-muted-foreground font-medium mb-10 text-lg">Your kitchen feels lonely. Let's add some magic!</p>
          <Button onClick={() => navigate("/")} className="h-14 px-10 rounded-2xl text-lg font-black shadow-xl shadow-primary/20">
            Explore the Menu
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full animate-pulse delay-500" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Badge variant="outline" className="mb-2 px-3 py-1 rounded-full bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[8px]">
              Review Order
            </Badge>
            <h1 className="text-4xl font-serif font-black tracking-tighter">Your Cart</h1>
          </div>
          <Button variant="ghost" className="rounded-xl h-10 gap-2 text-muted-foreground hover:bg-muted/50 font-bold" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Button>
        </div>

        <div className="grid md:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div key={item.dishId} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className="glass-card border-0 shadow-lg group hover:shadow-xl transition-all rounded-3xl overflow-hidden">
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-4">
                      <div className="h-24 w-24 rounded-2xl overflow-hidden bg-muted shrink-0 border border-white/20 shadow-inner">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-3xl bg-gradient-to-br from-muted to-muted/50">🥘</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h3 className="font-bold text-lg truncate mb-1 leading-tight">{item.name}</h3>
                        <p className="font-black text-primary">₹{item.price}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-2xl border border-border/40 w-full sm:w-auto justify-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-xl" onClick={() => updateQuantity(item.dishId, item.quantity - 1)}>
                            <Minus className="h-3 w-3 text-primary" />
                          </Button>
                          <span className="w-6 text-center font-black text-lg">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-xl" onClick={() => updateQuantity(item.dishId, item.quantity + 1)} disabled={item.quantity >= (item.maxStock || 100)}>
                            <Plus className="h-3 w-3 text-primary" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4 px-2">
                          <p className="font-black text-xl">₹{(item.price * item.quantity).toFixed(0)}</p>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full transition-colors" onClick={() => removeItem(item.dishId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <Card className="glass-card border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="pt-6 pb-2 px-6">
                <CardTitle className="text-xl font-serif font-black tracking-tight">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">Order Notes</Label>
                  <Textarea
                    placeholder="Timing, spice level..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-2xl bg-muted/40 border-border/50 focus:ring-primary/20 resize-none min-h-[100px] p-3 text-sm font-medium"
                  />
                </div>

                <div className="pt-4 border-t-2 border-dashed border-border/40 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-black text-muted-foreground px-1 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-end mt-2 px-1">
                    <span className="font-serif font-black text-lg">Total</span>
                    <span className="text-3xl font-serif font-black text-primary leading-none">₹{totalAmount.toFixed(0)}</span>
                  </div>
                </div>

                <Button className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transform transition-all active:scale-95 bg-primary hover:bg-primary/90" size="lg" onClick={placeOrder} disabled={placing}>
                  {placing ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : "Place Order"}
                </Button>
              </CardContent>
            </Card>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center space-y-1">
              <ChefHat className="h-5 w-5 text-primary mx-auto opacity-50" />
              <p className="text-[10px] font-bold text-primary italic leading-tight">"Quality takes time. We prepare every meal with personalized care."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
