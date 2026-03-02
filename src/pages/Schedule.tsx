import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { CalendarDays, ShoppingCart, Filter, Send, Minus, Plus, CookingPot, Sun, CloudSun, Sunset, Moon, Sparkles, PhoneCall, ChevronRight, ArrowLeft, Heart, CheckCircle2, Edit2, XCircle, Clock, Trash2, AlertTriangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ScheduleManagement from "./manager/ScheduleManagement";

const Schedule = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const [viewMode, setViewMode] = useState<'browse' | 'request'>('browse');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [preorderOnly, setPreorderOnly] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestCategory, setRequestCategory] = useState<string>("");
  const [showExistingRequestWarning, setShowExistingRequestWarning] = useState(false);
  const [browseFilter, setBrowseFilter] = useState<{category: string; type: "all" | "veg" | "non-veg"}>({ category: "", type: "all" });
  const [requestForm, setRequestForm] = useState({
    dish: "",
    dishType: "veg" as "veg" | "non-veg",
    date: "",
    timeIndex: 1,
    quantity: 1,
    occasion: "",
    notes: ""
  });
  
  const getAvailableDishTypesForCategory = (category: string) => {
    const categoryDishes = dishes.filter((d: any) => {
      const cats = d.categories || d.category || [];
      return cats.includes(category);
    });
    const types = new Set(categoryDishes.map((d: any) => d.dish_type).filter((t: string) => t && t !== 'both'));
    return Array.from(types);
  };
  const { addItem } = useCart();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
        queryClient.invalidateQueries({ queryKey: ['all-scheduled'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-dishes'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-special-requests'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: specialRequests = [] } = useQuery({
    queryKey: ["all-special-requests"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("special_requests" as any)
        .select("*")
        .order("request_date", { ascending: false }) as any);
      return data || [];
    },
  });

  const { data: scheduledItems = [] } = useQuery({
    queryKey: ["scheduled-menu"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_menu")
        .select("*, dishes(*)")
        .gte("schedule_date", new Date().toISOString().split("T")[0])
        .order("schedule_date");
      return data || [];
    },
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("*").order("name");
      return data || [];
    },
  });

  const availableCategories = [...new Set(dishes.flatMap((d: any) => d.categories || d.category || []))] as string[];

  const categoryIcons: Record<string, string> = {
    snacks: '🍿',
    breakfast: '🍳',
    lunch: '🍱',
    dinner: '🍲',
    special: '🎉'
  };

  const getRequestsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return specialRequests.filter((r: any) => r.request_date === dateStr);
  };

  const getRequestForDate = (date: Date) => {
    return getRequestsForDate(date)[0];
  };

  const isUserRequest = (date: Date) => {
    if (!user) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return specialRequests.find((r: any) => r.request_date === dateStr && r.user_id === user.id);
  };

  let filteredItems = selectedDate
    ? scheduledItems.filter((item: any) => item.schedule_date === format(selectedDate, "yyyy-MM-dd"))
    : scheduledItems;

  if (preorderOnly) {
    filteredItems = filteredItems.filter((item: any) => item.preorder_enabled);
  }

  if (browseFilter.category) {
    filteredItems = filteredItems.filter((item: any) => {
      const cats = item.dishes?.categories || item.dishes?.category || [];
      return cats.includes(browseFilter.category);
    });
  }

  if (browseFilter.type !== "all") {
    filteredItems = filteredItems.filter((item: any) => item.dishes?.dish_type === browseFilter.type);
  }

  const handlePreorder = (item: any) => {
    if (!user) { navigate("/auth"); return; }
    addItem({
      dishId: item.dishes.id,
      name: item.dishes.name,
      price: item.dishes.selling_price,
      imageUrl: item.dishes.image_url,
      maxStock: item.quantity_available,
      scheduledMenuId: item.id
    });
    toast.success(`Added ${item.dishes.name} for pre-order`);
  };

  const submitRequest = async () => {
    if (!user) { navigate("/auth"); return; }
    
    // Check if there's already a pending request for this date
    const existingRequest = specialRequests.find((r: any) => 
      r.request_date === requestForm.date && r.status === 'pending'
    );
    
    if (existingRequest) {
      toast.error("Kitchen is busy for this day! Please contact the kitchen for more info.");
      return;
    }
    
    const times = ["Morning", "Afternoon", "Evening", "Night"];

    const payload = {
      user_id: user.id,
      dish_name: requestForm.dish,
      category: [requestCategory],
      request_date: requestForm.date,
      request_time: times[requestForm.timeIndex],
      quantity: requestForm.quantity,
      occasion: requestForm.occasion,
      notes: requestForm.notes,
      status: 'pending',
      dish_type: requestForm.dishType
    };

    if (editingRequestId) {
      const { error } = await (supabase
        .from("special_requests" as any)
        .update({
          dish_name: payload.dish_name,
          category: payload.category,
          request_date: payload.request_date,
          request_time: payload.request_time,
          quantity: payload.quantity,
          occasion: payload.occasion,
          notes: payload.notes,
          dish_type: payload.dish_type,
          status: 'pending'
        })
        .eq("id", editingRequestId) as any);
      
      if (error) { toast.error("Failed to update"); return; }
      
      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      toast.success("Request updated!");
      setViewMode('browse');
      setEditingRequestId(null);
    } else {
      const { error } = await (supabase.from("special_requests" as any).insert(payload) as any);
      if (error) { toast.error("Failed to save request"); return; }

      await supabase.from("notifications").insert({
        title: "New Special Request",
        message: `${user.email} requested ${requestForm.dish} for ${requestForm.date}`,
        type: "order"
      } as any);

      queryClient.invalidateQueries({ queryKey: ["all-special-requests"] });
      toast.success("Request sent!");
    }
    
    setViewMode('browse');
    setRequestForm({ dish: "", dishType: "veg", date: "", timeIndex: 1, quantity: 1, occasion: "", notes: "" });
    setRequestCategory("");
  };

  const scheduledDates = scheduledItems.map((item: any) => {
    const [y, m, d] = item.schedule_date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });
  const requestedDates = specialRequests.map((item: any) => {
    const [y, m, d] = item.request_date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  const timeIcons = [
    { icon: <Sun className="h-5 w-5" />, label: "Morning", color: "from-yellow-400 to-orange-500" },
    { icon: <CloudSun className="h-5 w-5" />, label: "Afternoon", color: "from-orange-400 to-amber-600" },
    { icon: <Sunset className="h-5 w-5" />, label: "Evening", color: "from-orange-500 to-pink-500" },
    { icon: <Moon className="h-5 w-5" />, label: "Night", color: "from-indigo-500 to-purple-700" }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="blob w-[500px] h-[500px] bg-orange-300/30 dark:bg-orange-900/20 top-[-10%] left-[-10%]"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="blob w-[400px] h-[400px] bg-amber-200/20 dark:bg-amber-900/10 bottom-[-5%] right-[-5%]"
        />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold">Schedule & Requests</h1>
          <p className="text-muted-foreground mt-2">Browse menus or request a special dish</p>
        </div>

        {role === 'manager' ? (
          <div className="glass-card rounded-[3rem] p-8 border border-white/10 shadow-2xl">
            <ScheduleManagement />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10 items-start">
            <div className="space-y-6 lg:sticky lg:top-24">
              <Card className="border-0 shadow-2xl bg-card/60 backdrop-blur-xl border-t border-white/20 dark:border-white/5">
                <CardHeader className="pb-3 px-6">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    {viewMode === 'browse' ? "Availability" : "Select Date"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setShowExistingRequestWarning(false); // Reset warning when date changes
                      if (date) setRequestForm({ ...requestForm, date: format(date, "yyyy-MM-dd") });
                    }}
                    modifiers={{ 
                      scheduled: scheduledDates,
                      requested: requestedDates 
                    }}
                    modifiersStyles={{ 
                      scheduled: { fontWeight: "bold", color: "hsl(var(--primary))", background: "hsl(var(--primary)/0.1)" },
                      requested: { fontWeight: "bold", border: "1px solid hsl(var(--primary))" }
                    }}
                    components={{
                      DayContent: props => {
                        const req = getRequestForDate(props.date);
                        const isSch = scheduledItems.some((item: any) => item.schedule_date === format(props.date, "yyyy-MM-dd"));
                        const isSelected = selectedDate && format(props.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                        
                        return (
                          <div className={`relative w-full h-full flex items-center justify-center transition-all ${isSelected ? "scale-110" : "hover:scale-110"}`}>
                            <span className={`${(req || isSch) ? "text-primary font-bold underline decoration-2 underline-offset-4" : ""} ${isSelected ? "z-10" : ""}`}>
                              {props.date.getDate()}
                            </span>
                            {isSelected && (
                              <motion.div 
                                layoutId="active-date"
                                className="absolute inset-0 bg-primary/20 rounded-full -z-10"
                              />
                            )}
                            <div className="absolute -bottom-1 flex gap-0.5">
                              {req && req.status === 'approved' && <span className="text-[6px]">✅</span>}
                              {req && req.status === 'pending' && <span className="text-[6px]">⏳</span>}
                              {req && req.status === 'rejected' && <span className="text-[6px]">❌</span>}
                              {isSch && !req && <span className="text-[6px]">📅</span>}
                            </div>
                          </div>
                        );
                      }
                    }}
                    className="rounded-2xl border shadow-inner p-2 mx-auto bg-background/40 backdrop-blur-sm"
                  />
                  <div className="flex flex-col gap-3 mt-6">
                    {viewMode === 'browse' ? (
                      <>
                        <Button variant={preorderOnly ? "default" : "outline"} className="w-full gap-2 rounded-2xl h-11 shadow-sm font-semibold" onClick={() => setPreorderOnly(!preorderOnly)}>
                          <Filter className="h-4 w-4" /> {preorderOnly ? "Show All" : "Pre-orders Only"}
                        </Button>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button className="w-full gap-2 rounded-2xl h-11 font-bold shadow-lg shadow-primary/20 bg-primary text-white" onClick={() => { 
                            if (selectedDate && getRequestForDate(selectedDate)) {
                              setShowExistingRequestWarning(true);
                            } else {
                              setRequestCategory(""); 
                              setViewMode('request'); 
                            }
                          }}>
                            <Sparkles className="h-4 w-4" /> Request a Dish
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <Button variant="ghost" className="w-full gap-2 h-11 font-medium text-primary hover:bg-primary/5" onClick={() => { setViewMode('browse'); setEditingRequestId(null); setRequestCategory(""); }}>
                        <ArrowLeft className="h-4 w-4" /> Back
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 pb-20">
              {viewMode === 'browse' ? (
                <div className="space-y-6">
                  {selectedDate && getRequestsForDate(selectedDate).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-primary"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />Special Requests</h3>
                      {getRequestsForDate(selectedDate)
                        .sort((a: any, b: any) => {
                          const statusOrder: Record<string, number> = { 'approved': 0, 'completed': 1, 'pending': 2, 'rejected': 3 };
                          return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
                        })
                        .map((req: any) => (
                          <Card key={req.id} className="overflow-hidden border-0 glass-card shadow-xl rounded-[2rem] border-l-4 border-l-orange-500">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Badge className={`rounded-full px-3 py-1 text-xs font-bold ${req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : req.status === 'completed' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                      {req.status.toUpperCase()}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">by {req.user_id === user?.id ? 'You' : 'Another User'}</span>
                                  </div>
                                  <h4 className="font-serif font-bold text-2xl mb-2">{req.dish_name}</h4>
                                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    <span className="bg-muted px-3 py-1 rounded-full">🕐 {req.request_time}</span>
                                    <span className="bg-muted px-3 py-1 rounded-full">📦 Qty: {req.quantity}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {user && req.user_id === user.id && req.status === 'pending' && (
                                    <>
                                      <Button onClick={() => { setRequestCategory(req.category?.[0] || ''); setEditingRequestId(req.id); setRequestForm({ dish: req.dish_name, dishType: req.dish_type || 'veg', date: req.request_date, timeIndex: ["Morning", "Afternoon", "Evening", "Night"].indexOf(req.request_time), quantity: req.quantity, occasion: req.occasion || "", notes: req.notes || "" }); setViewMode('request'); }} className="rounded-xl gap-2"><Edit2 className="h-4 w-4" /> Edit</Button>
                                      <Button variant="destructive" className="rounded-xl gap-2" onClick={async () => { if (confirm("Reject this request?")) { await (supabase.from("special_requests" as any).update({ status: 'rejected' }).eq("id", req.id) as any); queryClient.invalidateQueries({ queryKey: ["all-special-requests"] }); toast.success("Request rejected"); } }}><Trash2 className="h-4 w-4" /> Delete</Button>
                                    </>
                                  )}
                                  {(!user || req.user_id !== user.id) && <Button variant="outline" className="rounded-xl gap-2" onClick={() => toast.info("Contact kitchen!")}><PhoneCall className="h-4 w-4" /> Contact</Button>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" />Kitchen Menu</h3>
                      <div className="flex gap-2 ml-auto">
                        <Button size="sm" variant={browseFilter.type === "all" ? "default" : "outline"} onClick={() => setBrowseFilter({ ...browseFilter, type: "all" })}>All</Button>
                        <Button size="sm" variant={browseFilter.type === "veg" ? "default" : "outline"} className={browseFilter.type === "veg" ? "bg-green-600" : ""} onClick={() => setBrowseFilter({ ...browseFilter, type: browseFilter.type === "veg" ? "all" : "veg" })}>Veg</Button>
                        <Button size="sm" variant={browseFilter.type === "non-veg" ? "default" : "outline"} className={browseFilter.type === "non-veg" ? "bg-red-600" : ""} onClick={() => setBrowseFilter({ ...browseFilter, type: browseFilter.type === "non-veg" ? "all" : "non-veg" })}>Non-Veg</Button>
                      </div>
                    </div>
                    
                    {availableCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant={!browseFilter.category ? "default" : "outline"} onClick={() => setBrowseFilter({ ...browseFilter, category: "" })}>All</Button>
                        {availableCategories.map((cat) => (
                          <Button key={cat} size="sm" variant={browseFilter.category === cat ? "default" : "outline"} onClick={() => setBrowseFilter({ ...browseFilter, category: browseFilter.category === cat ? "" : cat })}>{cat}</Button>
                        ))}
                      </div>
                    )}
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-12 glass-card rounded-[2rem] border-2 border-dashed border-border/40">
                        <div className="text-5xl mb-4 opacity-30">👨‍🍳</div>
                        <p className="text-muted-foreground">{selectedDate ? `No menu for ${format(selectedDate, "MMM d")}` : "No upcoming menu"}</p>
                        {!selectedDate && <Button className="mt-4" onClick={() => { setRequestCategory(""); setViewMode('request'); }}>Request a Dish</Button>}
                      </div>
                    ) : (
                      filteredItems.map((item: any, i: number) => (
                        <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                          <Card className="overflow-hidden border-0 glass-card shadow-xl hover:shadow-2xl transition-all duration-300 group rounded-[2rem]">
                            <CardContent className="flex flex-col sm:flex-row items-center gap-5 p-5">
                              <div className="h-24 w-24 rounded-2xl overflow-hidden bg-muted shrink-0 shadow-lg border-2 border-white/50 relative">
                                {item.dishes?.image_url ? <img src={item.dishes.image_url} alt={item.dishes.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="h-full w-full flex items-center justify-center text-4xl">🥘</div>}
                                <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${item.dishes?.dish_type === 'non-veg' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                  {item.dishes?.dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-serif font-bold text-xl group-hover:text-primary transition-colors">{item.dishes?.name}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{item.dishes?.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-primary font-bold">₹{item.dishes?.selling_price}</span>
                                  {item.preorder_enabled && item.quantity_available > 0 && <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">{item.quantity_available} left</Badge>}
                                  {item.preorder_enabled && item.quantity_available <= 0 && <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>}
                                </div>
                              </div>
                              {item.preorder_enabled && item.quantity_available > 0 && <Button onClick={() => handlePreorder(item)} className="shrink-0 h-12 w-12 rounded-xl shadow-lg p-0 bg-primary"><ShoppingCart className="h-5 w-5" /></Button>}
                              {item.preorder_enabled && item.quantity_available <= 0 && <Button disabled className="shrink-0 h-12 w-12 rounded-xl shadow-lg p-0 bg-muted text-muted-foreground"><XCircle className="h-5 w-5" /></Button>}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <motion.div key="request" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6 pb-20">
                  {showExistingRequestWarning && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 rounded-[2rem] p-6"
                    >
                      <div className="flex items-start gap-4">
                        <motion.div 
                          animate={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                          className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0"
                        >
                          <AlertTriangle className="h-6 w-6 text-orange-600" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-orange-700 dark:text-orange-400 mb-1">Request Already Exists!</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            There's already a request for this date. Please contact the kitchen to check if another order is possible.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Button 
                              size="sm" 
                              className="rounded-full bg-green-600"
                              onClick={() => {
                                setShowExistingRequestWarning(false);
                                setRequestCategory("");
                                setViewMode('request');
                              }}
                            >
                              Proceed Anyway
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="rounded-full"
                              onClick={() => {
                                setShowExistingRequestWarning(false);
                                setViewMode('browse');
                              }}
                            >
                              Go Back
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="rounded-full text-orange-600"
                              onClick={() => window.open(`tel:+91750033196`, '_self')}
                            >
                              <PhoneCall className="h-4 w-4 mr-1" /> Call Kitchen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!selectedDate ? (
                    <div className="bg-orange-500/5 rounded-[2rem] p-8 text-center border-2 border-dashed border-orange-200">
                      <CookingPot className="h-16 w-16 mx-auto mb-4 text-orange-400/40 animate-pulse" />
                      <h2 className="text-xl font-serif font-bold mb-2">Select a date</h2>
                      <p className="text-muted-foreground text-sm">Pick a date from the calendar first</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Step 1: Category Selection - Smaller */}
                      <section className="space-y-3">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <span className="text-base">🥬</span> Select Category
                        </h2>
                        {availableCategories.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availableCategories.map((cat) => (
                              <motion.div 
                                key={cat} 
                                whileHover={{ scale: 1.03 }} 
                                whileTap={{ scale: 0.97 }} 
                                onClick={() => setRequestCategory(cat)} 
                                className={`cursor-pointer rounded-2xl p-3 text-center border-2 transition-all ${requestCategory === cat ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50 hover:bg-muted'}`}
                              >
                                <div className="text-2xl mb-1">{categoryIcons[cat?.toLowerCase()] || '🍽️'}</div>
                                <span className="text-xs font-semibold capitalize">{cat}</span>
                              </motion.div>
                            ))}
                          </div>
                        ) : <p className="text-muted-foreground text-sm">No categories available</p>}
                      </section>

                      {/* Step 2: Veg/Non-Veg Selection - Based on category */}
                      {requestCategory && (
                        <section className="space-y-3">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="text-base">🥗</span> Select Type
                          </h2>
                          <div className="flex gap-2">
                            {getAvailableDishTypesForCategory(requestCategory).includes('veg') && (
                              <Button 
                                variant={requestForm.dishType === "veg" ? "default" : "outline"} 
                                className={`rounded-full h-10 px-6 font-semibold text-sm ${requestForm.dishType === "veg" ? "bg-green-600" : ""}`} 
                                onClick={() => setRequestForm({ ...requestForm, dishType: "veg" })}
                              >
                                🥗 Vegetarian
                              </Button>
                            )}
                            {getAvailableDishTypesForCategory(requestCategory).includes('non-veg') && (
                              <Button 
                                variant={requestForm.dishType === "non-veg" ? "default" : "outline"} 
                                className={`rounded-full h-10 px-6 font-semibold text-sm ${requestForm.dishType === "non-veg" ? "bg-red-600" : ""}`} 
                                onClick={() => setRequestForm({ ...requestForm, dishType: "non-veg" })}
                              >
                                🍗 Non-Veg
                              </Button>
                            )}
                          </div>
                        </section>
                      )}

                      {/* Step 3: Dish Selection - Menu card style */}
                      {requestCategory && requestForm.dishType && (
                        <section className="space-y-3">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="text-base">🍽️</span> Choose Dish
                          </h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {dishes
                              .filter((d: any) => { 
                                const cats = d.categories || d.category || []; 
                                const typeMatch = d.dish_type === requestForm.dishType || d.dish_type === 'both';
                                return cats.includes(requestCategory) && typeMatch;
                              })
                              .slice(0, 8)
                              .map((d: any) => (
                                <motion.div 
                                  key={d.id} 
                                  whileHover={{ y: -4 }} 
                                  onClick={() => setRequestForm({ ...requestForm, dish: d.name, dishType: d.dish_type === 'both' ? requestForm.dishType : d.dish_type })} 
                                  className={`cursor-pointer rounded-2xl overflow-hidden border-2 p-3 text-center transition-all ${requestForm.dish === d.name ? 'border-primary bg-primary/5' : 'border-transparent bg-card shadow-sm hover:border-primary/30'}`}
                                >
                                  <div className="aspect-square rounded-xl overflow-hidden mb-2 relative">
                                    {d.image_url ? <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-2xl bg-muted">🥘</div>}
                                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${d.dish_type === 'non-veg' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                      {d.dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                                    </div>
                                  </div>
                                  <h4 className="font-bold text-xs truncate">{d.name}</h4>
                                </motion.div>
                              ))}
                          </div>
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Or type dish name</Label>
                            <Input placeholder="Your custom dish..." value={requestForm.dish} onChange={e => setRequestForm({ ...requestForm, dish: e.target.value })} className="rounded-xl h-10 mt-1 text-sm" />
                          </div>
                        </section>
                      )}

                      {/* Step 4: Timing - Animated Slider */}
                      {requestCategory && requestForm.dish && (
                        <section className="space-y-4">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="text-base">⏰</span> Select Timing
                          </h2>
                          <div className="relative bg-muted/50 rounded-2xl p-2 max-w-md mx-auto">
                            <div className="flex justify-between items-center relative">
                              {timeIcons.map((ti, i) => (
                                <motion.button
                                  key={ti.label}
                                  type="button"
                                  onClick={() => setRequestForm({ ...requestForm, timeIndex: i })}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  className={`relative z-10 p-3 rounded-xl transition-all ${requestForm.timeIndex === i ? 'bg-background shadow-md' : 'hover:bg-background/40'}`}
                                >
                                  <div className={`flex flex-col items-center gap-1 ${requestForm.timeIndex === i ? 'text-primary' : 'text-muted-foreground'}`}>
                                    <div className="flex justify-center transition-transform duration-300" style={{ transform: requestForm.timeIndex === i ? 'scale(1.2)' : 'scale(1)' }}>
                                      {ti.icon}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-tight">{ti.label}</span>
                                  </div>
                                </motion.button>
                              ))}
                              <motion.div 
                                layout
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={`absolute top-1 bottom-1 rounded-xl bg-gradient-to-br ${timeIcons[requestForm.timeIndex].color} opacity-20`}
                                style={{
                                  width: '25%',
                                  left: `${requestForm.timeIndex * 25}%`
                                }}
                              />
                              <motion.div 
                                layout
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute -bottom-1 h-0.5 bg-primary rounded-full"
                                style={{
                                  width: '15%',
                                  left: `${requestForm.timeIndex * 25 + 5}%`
                                }}
                              />
                            </div>
                          </div>
                        </section>
                      )}

                      {/* Step 5: Details */}
                      {requestCategory && requestForm.dish && (
                        <section className="space-y-3">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="text-base">📝</span> Details
                          </h2>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="ml-1 font-semibold text-muted-foreground uppercase text-[10px]">Portions</Label>
                              <div className="flex items-center gap-2 bg-background rounded-xl h-10 px-3 border">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRequestForm({ ...requestForm, quantity: Math.max(1, requestForm.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                                <span className="text-lg font-bold flex-1 text-center">{requestForm.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRequestForm({ ...requestForm, quantity: requestForm.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="ml-1 font-semibold text-muted-foreground uppercase text-[10px]">Occasion</Label>
                              <Input value={requestForm.occasion} onChange={e => setRequestForm({ ...requestForm, occasion: e.target.value })} placeholder="Birthday, Party..." className="rounded-xl h-10 text-sm" />
                            </div>
                          </div>
                          <Textarea value={requestForm.notes} onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })} placeholder="Any special notes..." className="rounded-xl text-sm" />
                        </section>
                      )}

                      {requestCategory && requestForm.dish && (
                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <Button onClick={submitRequest} disabled={!requestForm.dish || !selectedDate} className="w-full h-14 rounded-2xl gap-3 text-lg font-bold shadow-lg bg-primary">
                            {editingRequestId ? "Update Request" : "Send Request"} <Send className="h-5 w-5" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
