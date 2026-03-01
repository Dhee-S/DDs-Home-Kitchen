import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Sun, Moon, User, LogOut, ChefHat, LayoutDashboard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Header = () => {
  const { user, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold font-serif tracking-tight">HomeKitchen</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-foreground/70 hover:text-primary transition-colors">Menu</Link>
          <Link to="/schedule" className="text-foreground/70 hover:text-primary transition-colors">Schedule</Link>
          {user && <Link to="/orders" className="text-foreground/70 hover:text-primary transition-colors">My Orders</Link>}
          {role === "manager" && (
            <Link to="/manager" className="text-foreground/70 hover:text-primary transition-colors">Dashboard</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {user && (
            <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => navigate("/cart")}>
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {totalItems}
                </Badge>
              )}
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                {role === "manager" && (
                  <DropdownMenuItem onClick={() => navigate("/manager")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} size="sm">Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
