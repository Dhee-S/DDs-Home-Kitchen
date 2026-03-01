import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: scheduledItems = [] } = useQuery({
    queryKey: ["scheduled-menu"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_menu")
        .select("*, dishes(*)")
        .eq("is_active", true)
        .gte("schedule_date", new Date().toISOString().split("T")[0])
        .order("schedule_date");
      return data || [];
    },
  });

  const scheduledDates = scheduledItems.map((item: any) => new Date(item.schedule_date));
  const filteredItems = selectedDate
    ? scheduledItems.filter((item: any) => item.schedule_date === format(selectedDate, "yyyy-MM-dd"))
    : scheduledItems;

  const handlePreorder = (dish: any, qty: number) => {
    if (!user) { navigate("/auth"); return; }
    addItem({ dishId: dish.id, name: dish.name, price: dish.selling_price, imageUrl: dish.image_url, maxStock: qty });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-serif font-bold">Scheduled Dishes</h1>
        <p className="text-muted-foreground mt-2">Plan ahead and pre-order your favorites</p>
      </div>

      <div className="grid md:grid-cols-[350px_1fr] gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" /> Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ scheduled: scheduledDates }}
              modifiersStyles={{ scheduled: { fontWeight: "bold", color: "hsl(var(--primary))" } }}
              className="rounded-md"
            />
            {selectedDate && (
              <Button variant="ghost" className="w-full mt-2" onClick={() => setSelectedDate(undefined)}>
                Show all dates
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No scheduled dishes {selectedDate ? "for this date" : "yet"}</p>
            </div>
          ) : (
            filteredItems.map((item: any, i: number) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted shrink-0">
                      {item.dishes?.image_url ? (
                        <img src={item.dishes.image_url} alt={item.dishes.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{item.dishes?.name}</h3>
                        <Badge variant="outline" className="shrink-0">{format(new Date(item.schedule_date), "MMM d")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.dishes?.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-bold text-primary">₹{item.dishes?.selling_price}</span>
                        <span className="text-xs text-muted-foreground">{item.quantity_available} available</span>
                        {item.preorder_enabled && <Badge className="text-[10px]">Pre-order</Badge>}
                      </div>
                    </div>
                    {item.preorder_enabled && item.quantity_available > 0 && (
                      <Button size="sm" onClick={() => handlePreorder(item.dishes, item.quantity_available)} className="shrink-0 gap-1">
                        <ShoppingCart className="h-3 w-3" /> Pre-order
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
