import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface DishCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  category: string;
  avgRating: number;
  reviewCount: number;
  dish_type?: "veg" | "non-veg";
  scheduledMenuId?: string;
}

const DishCard = ({ id, name, description, price, imageUrl, stockQuantity, category, avgRating, reviewCount, dish_type, scheduledMenuId }: DishCardProps) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const outOfStock = stockQuantity <= 0;

  const handleAdd = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    addItem({ dishId: id, name, price, imageUrl, maxStock: stockQuantity, scheduledMenuId }, quantity);
    toast.success(`Added ${quantity} ${name} to cart`);
    setQuantity(1);
  };

  const increaseQuantity = () => setQuantity(q => Math.min(q + 1, stockQuantity));
  const decreaseQuantity = () => setQuantity(q => Math.max(q - 1, 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="h-full overflow-hidden border-0 shadow-lg group relative bg-card flex flex-col rounded-2xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-secondary/30 text-muted-foreground">
              <span className="text-5xl">🍽️</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
            <Badge className="bg-background/90 text-foreground backdrop-blur-md shadow-sm border-0 font-medium px-3 py-1 text-[10px] rounded-lg uppercase tracking-wider">
              {category}
            </Badge>
          </div>

          {/* Stock Badge - Only show for scheduled items with quantity */}
          {stockQuantity !== undefined && stockQuantity > 0 && (
            <div className="absolute top-3 right-3 z-20">
              <Badge variant={outOfStock ? "destructive" : "secondary"} className="bg-background/90 text-foreground backdrop-blur-md shadow-sm border-0 px-3 py-1 text-[10px] rounded-lg font-bold">
                {outOfStock ? "Sold Out" : `${stockQuantity} Left`}
              </Badge>
            </div>
          )}

          {/* Out of stock overlay */}
          <AnimatePresence>
            {outOfStock && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center"
              >
                <div className="bg-destructive text-destructive-foreground px-6 py-2 rounded-full font-bold shadow-xl transform -rotate-12 border-2 border-background">
                  SOLD OUT
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CardContent className="p-5 flex-1 flex flex-col relative z-20 bg-card/50 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-xl leading-tight line-clamp-1">{name}</h3>
                <Badge variant="outline" className={`text-[8px] px-1.5 py-0.5 rounded-full border-0 font-black shrink-0 ${dish_type === 'non-veg' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                  {dish_type === 'non-veg' ? 'NON-VEG' : 'VEG'}
                </Badge>
              </div>
            </div>
            <span className="text-xl font-black text-primary whitespace-nowrap bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl shadow-sm">₹{price}</span>
          </div>

          <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-4 flex-1 font-medium leading-relaxed">
            {description}
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5 bg-muted/50 w-fit px-3 py-1 rounded-full border border-border/50 font-bold">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "New ✨"}</span>
            {reviewCount > 0 && <span className="opacity-50 font-medium">({reviewCount})</span>}
          </div>

          <div className="space-y-4 mt-auto">
            {!outOfStock && (
              <div className="flex items-center justify-between border-2 border-primary/10 rounded-[1.25rem] p-1 bg-background/40 backdrop-blur-sm shadow-inner group-hover:border-primary/30 transition-colors">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-primary/10 rounded-xl"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4 text-primary" />
                </Button>
                <span className="font-black text-lg inline-block w-10 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-primary/10 rounded-xl"
                  onClick={increaseQuantity}
                  disabled={quantity >= stockQuantity}
                >
                  <Plus className="h-4 w-4 text-primary" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleAdd}
              disabled={outOfStock}
              className="w-full gap-2 rounded-[1.25rem] h-14 font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] transform active:scale-95 bg-primary hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" />
              {outOfStock ? "Sold Out" : `Add to Plate • ₹${(price * quantity).toFixed(0)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DishCard;
