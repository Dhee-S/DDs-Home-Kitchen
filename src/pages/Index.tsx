import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DishCard from "@/components/dishes/DishCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ChefHat, Clock, Star, Truck } from "lucide-react";

const Index = () => {
  const { data: dishes = [], isLoading } = useQuery({
    queryKey: ["dishes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dishes")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

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
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent to-background py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-4">
              Fresh from Our <span className="text-primary">Kitchen</span> to Your Table
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Discover delicious homemade meals prepared with the freshest ingredients. Order today or schedule for later!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-12"
          >
            {features.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-4 text-center">
                <f.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Today's Menu */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-bold">Today's Menu</h2>
          <p className="text-muted-foreground mt-2">Freshly prepared dishes available right now</p>
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
        ) : dishes.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">No dishes available yet</h3>
            <p className="text-muted-foreground/70 mt-1">Check back soon for our daily menu!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dishes.map((dish: any) => {
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
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
