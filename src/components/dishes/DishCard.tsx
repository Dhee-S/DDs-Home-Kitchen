import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";

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
}

const DishCard = ({ id, name, description, price, imageUrl, stockQuantity, category, avgRating, reviewCount }: DishCardProps) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outOfStock = stockQuantity <= 0;

  const handleAdd = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    addItem({ dishId: id, name, price, imageUrl, maxStock: stockQuantity });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden group relative">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🍽️</span>
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Badge variant="destructive" className="text-sm px-4 py-1">Out of Stock</Badge>
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-background/80 text-foreground backdrop-blur-sm text-xs">{category}</Badge>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif font-semibold text-lg leading-tight">{name}</h3>
            <span className="text-lg font-bold text-primary whitespace-nowrap">₹{price}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-medium">{avgRating > 0 ? avgRating.toFixed(1) : "New"}</span>
              {reviewCount > 0 && <span className="text-muted-foreground">({reviewCount})</span>}
            </div>
            {!outOfStock && <span className="text-xs text-muted-foreground">{stockQuantity} left</span>}
          </div>
          <Button
            onClick={handleAdd}
            disabled={outOfStock}
            className="w-full gap-2"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4" />
            {outOfStock ? "Unavailable" : "Add to Cart"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DishCard;
