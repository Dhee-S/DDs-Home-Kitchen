import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  DollarSign,
  BarChart3,
  CalendarDays,
  Utensils,
  UserPlus,
  Crown,
  Loader2,
  Check,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ManagerDashboard = () => {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [managerEmail, setManagerEmail] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["manager-stats"],
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("total_amount, status");
      const { count: dishCount } = await supabase.from("dishes").select("*", { count: 'exact', head: true });
      const { count: userCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
      const { count: requestCount } = await supabase.from("special_requests" as any).select("*", { count: 'exact', head: true });

      const revenue = orders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;

      return { revenue, dishCount, userCount, requestCount, completedOrders };
    }
  });

  const { data: managers = [] } = useQuery({
    queryKey: ["all-managers"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*, profiles!inner(email, name)").eq("role", "manager");
      return data || [];
    }
  });

  const addManagerMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: profile } = await supabase.from("profiles").select("id").ilike("email", `%${email}%`).single();
      if (!profile) throw new Error("User not found with this email");
      
      const { error } = await supabase.from("user_roles").insert({
        user_id: profile.id,
        role: "manager"
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-managers"] });
      setManagerEmail("");
      setAddManagerOpen(false);
      toast.success("New manager added successfully!");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const removeManagerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "manager");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-managers"] });
      toast.success("Manager removed");
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (loading) return null;
  if (role !== "manager") return <Navigate to="/" replace />;

  const analyticsCards = [
    { title: "Total Revenue", value: `₹${stats?.revenue.toLocaleString() || 0}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Customers", value: stats?.userCount || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Special Requests", value: stats?.requestCount || 0, icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
    { title: "Dishes in Menu", value: stats?.dishCount || 0, icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-primary/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-orange-500/5 blur-[100px] rounded-full animate-pulse delay-500" />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 flex items-center justify-center rounded-2xl border border-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary text-white rounded-full uppercase text-[10px] font-black tracking-widest px-3">Manager Insights</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter">Kitchen Analytics</h1>
            <p className="text-muted-foreground font-medium">Hello Chef! Here's a bird's eye view of your home kitchen business.</p>
          </div>

          <Button variant="ghost" onClick={() => navigate("/")} className="rounded-2xl h-12 gap-2 text-muted-foreground hover:bg-muted/50 transition-all font-bold">
            <ArrowLeft className="h-4 w-4" /> Back to Storefront
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {analyticsCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-xl glass-card rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-2xl ${card.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <h3 className="text-3xl font-black mb-1">{card.value}</h3>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{card.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-0 shadow-2xl glass-card rounded-[3rem] p-8 h-full border border-white/10">
              <CardHeader className="p-0 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-serif font-bold">Order Fulfillment</CardTitle>
                    <p className="text-sm text-muted-foreground">Kitchen production efficiency</p>
                  </div>
                  <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-10">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <Label className="font-bold text-sm">Completion Rate</Label>
                    <span className="text-xs font-black text-primary">
                      {stats ? Math.round((stats.completedOrders / (stats.revenue > 0 ? stats.revenue : 1)) * 100) : 0}%
                    </span>
                  </div>
                  <Progress value={85} className="h-3 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50 text-center">
                    <CalendarDays className="h-6 w-6 text-primary mx-auto mb-2" />
                    <h4 className="text-2xl font-black">12</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scheduled This Week</p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-background/50 border border-border/50 text-center">
                    <ShoppingBag className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <h4 className="text-2xl font-black">8</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Pre-orders</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-0 shadow-2xl glass-card rounded-[3rem] p-8 h-full border border-white/10">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-2xl font-serif font-bold italic">Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground">Jump directly to specialized management pages</p>
              </CardHeader>
              <div className="grid gap-4">
                {[
                  { label: "Update Today's Menu", path: "/", sub: "Add dishes or update stock" },
                  { label: "Approve Schedule", path: "/schedule", sub: "View and approve special requests" },
                  { label: "Fulfill Orders", path: "/orders", sub: "Mark orders as ready or completed" },
                ].map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    onClick={() => navigate(action.path)}
                    className="group h-auto p-6 rounded-2xl justify-between border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="space-y-1">
                      <span className="font-bold block text-base group-hover:text-primary transition-colors">{action.label}</span>
                      <span className="text-xs text-muted-foreground font-normal">{action.sub}</span>
                    </div>
                    <LayoutDashboard className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Manager Team Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <Card className="border-0 shadow-2xl glass-card rounded-[3rem] p-8 border border-white/10">
              <CardHeader className="p-0 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                      <Crown className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-serif font-bold">Kitchen Team</CardTitle>
                      <p className="text-sm text-muted-foreground">Manage manager access</p>
                    </div>
                  </div>
                  <Dialog open={addManagerOpen} onOpenChange={setAddManagerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-full gap-1 bg-yellow-500 hover:bg-yellow-600">
                        <UserPlus className="h-4 w-4" /> Add Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle className="font-serif font-bold">Add New Manager</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>User Email</Label>
                          <Input 
                            type="email" 
                            value={managerEmail}
                            onChange={(e) => setManagerEmail(e.target.value)}
                            placeholder="Enter user's email address"
                          />
                          <p className="text-xs text-muted-foreground mt-1">The user must have an account to be added as manager</p>
                        </div>
                        <Button 
                          onClick={() => addManagerMutation.mutate(managerEmail)}
                          disabled={addManagerMutation.isPending || !managerEmail}
                          className="w-full rounded-full"
                        >
                          {addManagerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add as Manager
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {managers.map((mgr: any) => (
                  <div key={mgr.user_id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {(mgr.profiles?.name || mgr.profiles?.email || 'M')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{mgr.profiles?.name || 'Manager'}</p>
                        <p className="text-xs text-muted-foreground">{mgr.profiles?.email}</p>
                      </div>
                    </div>
                    {mgr.user_id !== user?.id && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeManagerMutation.mutate(mgr.user_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {mgr.user_id === user?.id && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">You</Badge>
                    )}
                  </div>
                ))}
                {managers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Crown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No managers added yet</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
