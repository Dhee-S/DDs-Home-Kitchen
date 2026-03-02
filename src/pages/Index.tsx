import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DishCard from "@/components/dishes/DishCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChefHat, Clock, Star, Truck, Filter, CheckCircle2, XCircle, Calendar, Sparkles, Flame, CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import MenuManagement from "./manager/MenuManagement";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<{
    type: "all" | "veg" | "non-veg";
    stock: "all" | "in-stock" | "out-of-stock";
    scheduled: boolean;
  }>({
    type: "all",
    stock: "all",
    scheduled: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel('scheduled-menu-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-dishes'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-dishes'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-menu'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data: dishes = [], isLoading } = useQuery({
    queryKey: ["dishes", filter],
    queryFn: async () => {
      let query = supabase.from("dishes").select("*");

      if (!filter.scheduled) {
        query = query.eq("is_available", true);
      }

      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: scheduledDishes = [] } = useQuery({
    queryKey: ["scheduled-dishes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_menu")
        .select("*, dishes(*)")
        .gte("schedule_date", todayStr)
        .lte("schedule_date", weekEndStr)
        .order("schedule_date");
      return data || [];
    }
  });

  const todaysSpecialDishes = scheduledDishes.filter((item: any) => item.schedule_date === todayStr);
  const weeklySpecialDishes = scheduledDishes.filter((item: any) => item.schedule_date !== todayStr);

  const { data: allScheduledDishIds = [] } = useQuery({
    queryKey: ["scheduled-dishes-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_menu").select("dish_id");
      return data?.map(d => d.dish_id) || [];
    }
  });

  const filteredDishes = dishes.filter((dish: any) => {
    if (filter.type !== "all" && dish.dish_type !== filter.type) return false;
    if (filter.stock === "in-stock" && dish.stock_quantity <= 0) return false;
    if (filter.stock === "out-of-stock" && dish.stock_quantity > 0) return false;
    if (filter.scheduled && !allScheduledDishIds.includes(dish.id)) return false;
    return true;
  });

  const availableDishes = dishes.filter((dish: any) => dish.is_available && dish.stock_quantity > 0);

  const { data: reviews = [] } = useQuery({
    queryKey: ["all-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("dish_id, rating");
      return data || [];
    },
  });

  const getAvgRating = (dishId: string) => {
    const dishReviews = reviews.filter((r: any) => r.dish_id === dishId);
    if (dishReviews.length === 0) return { avg: 0, count: 0 };
    const avg = dishReviews.reduce((s: number, r: any) => s + r.rating, 0) / dishReviews.length;
    return { avg, count: dishReviews.length };
  };

  const features = [
    { icon: ChefHat, title: "Homemade Fresh", desc: "Prepared daily with love" },
    { icon: Clock, title: "Easy Preorder", desc: "Schedule meals in advance" },
    { icon: Star, title: "Top Rated", desc: "Loved by our customers" },
    { icon: Truck, title: "Quick Pickup", desc: "Ready when you are" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Section with Premium Atmosphere */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        {/* Atmospheric Blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <Badge
                variant="outline"
                className="mb-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white border-0 font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/30 animate-pulse"
              >
                <span className="mr-2">👨‍🍳</span>
                Master Cook: <span className="text-orange-100 ml-1">Ponnukodi S</span>
              </Badge>
            </motion.div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-black tracking-tighter mb-6 leading-[1.1]">
              Fresh from Our <span className="text-primary italic">Kitchen</span> <br /> to Your Table
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 font-medium leading-relaxed">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Premium homemade meals crafted with love and fresh ingredients by{' '}
                <motion.span
                  className="text-primary font-black"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  Cook Ponnukodi S
                </motion.span>
                .{' '}
              </motion.span>
              <span className="hidden sm:inline">Experience authentic taste delivered to your doorstep!</span>
              <motion.span
                className="sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Experience authentic taste delivered to your doorstep!
              </motion.span>
            </p>
          </motion.div>

          {/* Feature Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto mt-12 sm:mt-16"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="glass-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 text-center border-white/10 shadow-xl transition-all hover:shadow-2xl hover:shadow-primary/5 group"
              >
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider mb-1">{f.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Menu Sections */}
      <section className="container mx-auto px-4 pb-16">
        {role === "manager" ? (
          <div className="glass-card rounded-[3rem] p-8 border border-white/10 shadow-2xl">
            <MenuManagement />
          </div>
        ) : (
          <>
            {/* Today's Special Section */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-serif font-bold">Today's Special</h2>
                  <p className="text-muted-foreground">Freshly prepared for you today</p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-48 w-full rounded-xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : todaysSpecialDishes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 glass-card rounded-[2rem] border-2 border-dashed border-orange-200/40 bg-orange-50/30 dark:bg-orange-950/10"
                >
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl mb-4"
                  >
                    👨‍🍳
                  </motion.div>
                  <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400">Chef is Preparing Something Special!</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Our cook is busy in the kitchen. <br className="hidden sm:block" />
                    Want something specific? Schedule your request!
                  </p>
                  <Button 
                    onClick={() => navigate("/schedule")}
                    className="mt-6 rounded-full bg-orange-500 hover:bg-orange-600 gap-2"
                  >
                    <CalendarRange className="h-4 w-4" />
                    Schedule Your Cravings
                  </Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {todaysSpecialDishes.map((item: any) => {
                    const dish = item.dishes;
                    const { avg, count } = getAvgRating(dish?.id);
                    const displayPrice = item.schedule_price || dish?.selling_price;
                    return (
                      <DishCard
                        key={dish?.id}
                        id={dish?.id}
                        name={dish?.name}
                        description={dish?.description}
                        price={displayPrice}
                        imageUrl={dish?.image_url}
                        stockQuantity={item.quantity_available || dish?.stock_quantity}
                        category={dish?.category}
                        avgRating={avg}
                        reviewCount={count}
                        dish_type={dish?.dish_type}
                        scheduledMenuId={item.id}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly Special Section - Only show if items exist */}
            {weeklySpecialDishes.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-16"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
                    <CalendarRange className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold">This Week's Menu</h2>
                    <p className="text-muted-foreground">Upcoming dishes planned for this week</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {weeklySpecialDishes.slice(0, 8).map((item: any) => {
                    const dish = item.dishes;
                    const { avg, count } = getAvgRating(dish?.id);
                    const displayPrice = item.schedule_price || dish?.selling_price;
                    return (
                      <DishCard
                        key={dish?.id}
                        id={dish?.id}
                        name={dish?.name}
                        description={dish?.description}
                        price={displayPrice}
                        imageUrl={dish?.image_url}
                        stockQuantity={item.quantity_available || dish?.stock_quantity}
                        category={item.schedule_date}
                        avgRating={avg}
                        reviewCount={count}
                        dish_type={dish?.dish_type}
                        scheduledMenuId={item.id}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Full Menu Section */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <ChefHat className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-serif font-bold">Full Menu</h2>
                    <p className="text-muted-foreground">Browse all available dishes</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                <Button
                  variant={filter.type === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, type: "all" })}
                  className="rounded-full px-5"
                >
                  All
                </Button>
                <Button
                  variant={filter.type === "veg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, type: "veg" })}
                  className="rounded-full px-5 gap-2"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500" /> Veg
                </Button>
                <Button
                  variant={filter.type === "non-veg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, type: "non-veg" })}
                  className="rounded-full px-5 gap-2"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500" /> Non-Veg
                </Button>

                <div className="w-px h-6 bg-border mx-2" />

                <Button
                  variant={filter.stock === "in-stock" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, stock: filter.stock === "in-stock" ? "all" : "in-stock" })}
                  className="rounded-full px-5 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> In Stock
                </Button>
                <Button
                  variant={filter.stock === "out-of-stock" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, stock: filter.stock === "out-of-stock" ? "all" : "out-of-stock" })}
                  className="rounded-full px-5 gap-2"
                >
                  <XCircle className="h-4 w-4" /> Out of Stock
                </Button>

                <div className="w-px h-6 bg-border mx-2" />

                <Button
                  variant={filter.scheduled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter({ ...filter, scheduled: !filter.scheduled })}
                  className="rounded-full px-5 gap-2"
                >
                  <Calendar className="h-4 w-4" /> Scheduled
                </Button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-48 w-full rounded-xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredDishes.length === 0 ? (
                <div className="text-center py-20">
                  <ChefHat className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No dishes match your filters</h3>
                  <p className="text-muted-foreground/70 mt-1">Try changing your selection!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDishes.map((dish: any) => {
                    const { avg, count } = getAvgRating(dish.id);
                    return (
                      <DishCard
                        key={dish.id}
                        id={dish.id}
                        name={dish.name}
                        description={dish.description}
                        price={dish.selling_price}
                        imageUrl={dish.image_url}
                        stockQuantity={dish.stock_quantity}
                        category={dish.category}
                        avgRating={avg}
                        reviewCount={count}
                        dish_type={dish.dish_type}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Index;
