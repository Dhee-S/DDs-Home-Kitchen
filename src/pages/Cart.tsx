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

      const code = orderData?.order_code || orderData;

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
        {/* Success Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-green-500/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full relative z-10 space-y-6">
          <Card className="glass-card border-0 shadow-2xl rounded-[3rem] text-center p-10">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <span className="text-5xl">🎉</span>
            </div>
            <h1 className="text-4xl font-serif font-black tracking-tighter mb-4">Deliciously Confirmed!</h1>
            <p className="text-muted-foreground font-medium mb-10 leading-relaxed">
              Your order is being prepared with love. <br /> Get ready for a treat!
            </p>

            <div className="bg-muted/40 p-6 rounded-[2rem] border border-border/50 mb-10 shadow-inner">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-2">Your Secret Order Code</p>
              <p className="text-5xl font-mono font-black text-primary tracking-widest leading-none">{orderCode}</p>
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

          {/* Payment Info Notification */}
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
                      <div className="h-12 w-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-serif font-black">Complete Payment</h2>
                    </div>
                    
                    <p className="text-center text-muted-foreground mb-6">Please pay ₹{totalAmount} via GPay or PhonePe to complete your order</p>
                    
                    <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-blue-100 mb-6">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-md">
                          <span className="text-3xl">📱</span>
                        </div>
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                          <Phone className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Pay to this number</p>
                        <p className="text-4xl font-mono font-black text-primary">{PAYMENT_NUMBER}</p>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setShowPaymentInfo(false);
                        toast.info("Payment confirmation sent! Manager will verify.");
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-black shadow-lg bg-green-500 hover:bg-green-600 gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      I've Made the Payment
                    </Button>
                    
                    <p className="text-center text-xs text-muted-foreground mt-4">
                      💡 After payment, our team will verify and confirm your order
                    </p>
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
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full animate-pulse delay-500" />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Badge variant="outline" className="mb-3 px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
              Checkout
            </Badge>
            <h1 className="text-5xl font-serif font-black tracking-tighter">Your Table</h1>
            <p className="text-muted-foreground font-medium">Review your selection before we start cooking.</p>
          </div>
          <Button variant="ghost" className="rounded-2xl h-12 gap-2 text-muted-foreground hover:bg-muted/50 transition-all font-bold" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-10">
          <div className="space-y-6">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div key={item.dishId} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className="glass-card border-0 shadow-lg group hover:shadow-xl transition-all rounded-[2.5rem] overflow-hidden">
                    <CardContent className="flex items-center gap-6 p-6">
                      <div className="h-28 w-28 rounded-3xl overflow-hidden bg-muted shrink-0 border border-white/20 shadow-inner">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-4xl bg-gradient-to-br from-muted to-muted/50">🍲</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-black text-2xl truncate mb-1 leading-tight">{item.name}</h3>
                        <p className="text-lg font-black text-primary">₹{item.price}</p>
                      </div>
                      <div className="flex flex-col items-end gap-4">
                        <div className="flex items-center gap-4 bg-muted/40 p-1.5 rounded-2xl border border-border/40 shadow-inner">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-xl" onClick={() => updateQuantity(item.dishId, item.quantity - 1)}>
                            <Minus className="h-4 w-4 text-primary" />
                          </Button>
                          <span className="w-6 text-center font-black text-lg">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background rounded-xl" onClick={() => updateQuantity(item.dishId, item.quantity + 1)} disabled={item.quantity >= item.maxStock}>
                            <Plus className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-5">
                          <p className="font-black text-xl">₹{(item.price * item.quantity).toFixed(0)}</p>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-full transition-colors" onClick={() => removeItem(item.dishId)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-8">
            <Card className="glass-card border-0 shadow-2xl rounded-[3rem] overflow-hidden">
              <CardHeader className="pt-8 pb-4">
                <CardTitle className="text-2xl font-serif font-black tracking-tight">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-2">Order Notes</Label>
                  <Textarea
                    placeholder="Any special requests? (Timing, spice level...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-3xl bg-muted/40 border-border/50 focus:ring-primary/20 resize-none min-h-[120px] p-4 font-medium"
                  />
                </div>

                <div className="pt-6 border-t-2 border-dashed border-border/40 flex flex-col gap-1">
                  <div className="flex justify-between text-sm font-medium text-muted-foreground px-1">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-end mt-2 px-1">
                    <span className="font-serif font-black text-xl">Total</span>
                    <span className="text-4xl font-serif font-black text-primary leading-none">₹{totalAmount.toFixed(0)}</span>
                  </div>
                </div>

                <Button className="w-full h-18 rounded-[2rem] text-xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transform transition-all active:scale-95 bg-primary hover:bg-primary/90" size="lg" onClick={placeOrder} disabled={placing}>
                  {placing ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : "Place Order"}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground font-bold px-4">
                  * By placing this order, you agree to our kitchen's terms of service.
                </p>
              </CardContent>
            </Card>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 text-center space-y-2">
              <ChefHat className="h-6 w-6 text-primary mx-auto opacity-50" />
              <p className="text-xs font-bold text-primary italic">"Quality takes time. We prepare every meal with personalized care."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
