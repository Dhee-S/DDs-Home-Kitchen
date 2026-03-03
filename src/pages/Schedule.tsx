import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { format, addDays } from "date-fns";
import { CalendarDays, ShoppingCart, Filter, Send, Minus, Plus, CookingPot, Sun, CloudSun, Sunset, Moon, Sparkles, PhoneCall, ArrowLeft, CheckCircle2, Edit2, XCircle, Clock, Trash2, AlertTriangle, Info, ArrowRight, Utensils, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScheduleManagement from "./manager/ScheduleManagement";

const Schedule = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fromMenu = searchParams.get('from') === 'menu';
  const requestedDish = searchParams.get('dish') || '';
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [preorderOnly, setPreorderOnly] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "veg" | "non-veg">("all");
  
  const { addItem } = useCart();
  const { user, role } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel('schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0];

  const { data: scheduledItems = [], isLoading } = useQuery({
    queryKey: ["scheduled-menu", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_menu")
        .select("*, dishes(*)")
        .gte("schedule_date", today)
        .lte("schedule_date", nextWeek)
        .order("schedule_date");
      if (error) {
        console.error("Fetch error:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ["all-dishes"],
    queryFn: async () => {
      const { data } = await supabase.from("dishes").select("id, name, description, selling_price, image_url, dish_type, categories, category").order("name");
      return data || [];
    },
  });

  const availableCategories = [...new Set(dishes.flatMap((d: any) => d.categories || d.category || []))] as string[];

  const scheduledDates = scheduledItems.map((item: any) => {
    const [y, m, d] = item.schedule_date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  let filteredItems = selectedDate
    ? scheduledItems.filter((item: any) => item.schedule_date === format(selectedDate, "yyyy-MM-dd"))
    : scheduledItems;

  if (preorderOnly) {
    filteredItems = filteredItems.filter((item: any) => item.preorder_enabled);
  }

  if (filterType !== "all") {
    filteredItems = filteredItems.filter((item: any) => item.dishes?.dish_type === filterType);
  }

  const handleAddToCart = (item: any) => {
    if (!user) { navigate("/auth"); return; }
    if (!item.preorder_enabled || item.quantity_available <= 0) {
      toast.error("This item is not available for pre-order");
      return;
    }
    addItem({
      dishId: item.dishes.id,
      name: item.dishes.name,
      price: item.schedule_price || item.dishes.selling_price,
      imageUrl: item.dishes.image_url,
      maxStock: item.quantity_available,
      scheduledMenuId: item.id
    });
    toast.success(`Added ${item.dishes.name} to cart!`);
    navigate("/cart");
  };

  const timeIcons = [
    { icon: <Sun className="h-4 w-4" />, label: "Morning" },
    { icon: <CloudSun className="h-4 w-4" />, label: "Afternoon" },
    { icon: <Sunset className="h-4 w-4" />, label: "Evening" },
    { icon: <Moon className="h-4 w-4" />, label: "Night" }
  ];

  if (role === 'manager') {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-bold text-center mb-8">Schedule Management</h1>
        <ScheduleManagement />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {fromMenu && (
        <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border-b border-primary/20 py-3 px-4">
          <div className="container mx-auto flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" />
            <span>
              {requestedDish ? `Pre-order: ${requestedDish}` : "Select a date to schedule your meal"}
            </span>
            <Button variant="link" size="sm" className="ml-auto h-auto p-0" onClick={() => navigate("/")}>
              View Menu <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold">Meal Schedule</h1>
          <p className="text-muted-foreground">Pre-order your meals for upcoming dates</p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date)}
                  modifiers={{ scheduled: scheduledDates }}
                  modifiersStyles={{ scheduled: { fontWeight: "bold", color: "hsl(var(--primary))" } }}
                  className="rounded-lg"
                />
                <div className="mt-4 space-y-2">
                  <Button 
                    variant={preorderOnly ? "default" : "outline"} 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => setPreorderOnly(!preorderOnly)}
                  >
                    <Filter className="h-4 w-4" /> 
                    {preorderOnly ? "Show All" : "Pre-order Only"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">This Week</span>
                  <span className="font-bold">{scheduledItems.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Dates</span>
                  <span className="font-bold">{scheduledDates.length} days</span>
                </div>
                <Button className="w-full mt-2" onClick={() => navigate("/cart")}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> View Cart
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>All</Button>
              <Button size="sm" variant={filterType === "veg" ? "default" : "outline"} className={filterType === "veg" ? "bg-green-600" : ""} onClick={() => setFilterType(filterType === "veg" ? "all" : "veg")}>Veg</Button>
              <Button size="sm" variant={filterType === "non-veg" ? "default" : "outline"} className={filterType === "non-veg" ? "bg-red-600" : ""} onClick={() => setFilterType(filterType === "non-veg" ? "all" : "non-veg")}>Non-Veg</Button>
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <Card className="p-8 text-center">
                <CookingPot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-bold text-lg mb-2">No Meals Scheduled</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {selectedDate 
                    ? `No menu available for ${format(selectedDate, "MMMM d")}` 
                    : "No upcoming meals scheduled"}
                </p>
                <Button onClick={() => navigate("/")}>
                  <Utensils className="h-4 w-4 mr-2" /> Browse Full Menu
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item: any) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] relative">
                      {item.dishes?.image_url ? (
                        <img src={item.dishes.image_url} alt={item.dishes.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted text-4xl">🍽️</div>
                      )}
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold ${item.dishes?.dish_type === 'non-veg' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                        {item.dishes?.dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                      </div>
                      {item.preorder_enabled && item.quantity_available > 0 && (
                        <Badge className="absolute top-2 right-2 bg-green-500">{item.quantity_available} left</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-1">{item.dishes?.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.dishes?.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-primary">
                          ₹{item.schedule_price || item.dishes?.selling_price}
                        </span>
                        {item.preorder_enabled && item.quantity_available > 0 ? (
                          <Button size="sm" onClick={() => handleAddToCart(item)}>
                            <ShoppingCart className="h-4 w-4 mr-1" /> Order
                          </Button>
                        ) : (
                          <Badge variant="destructive">Sold Out</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
