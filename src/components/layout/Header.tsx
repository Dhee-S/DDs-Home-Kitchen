import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Sun, Moon, User, LogOut, ChefHat, LayoutDashboard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ProfileReminder from "./ProfileReminder";

const Header = () => {
  const { user, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  const navItemClass = (path: string) => {
    const active = isActive(path);
    return `transition-all px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 ${active
        ? "text-primary bg-primary/10 border border-primary/20 shadow-sm shadow-primary/5"
        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
      }`;
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/10 dark:border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group transition-all">
          <div className="bg-primary/90 p-1.5 rounded-2xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-serif font-black tracking-tighter bg-gradient-to-br from-foreground via-foreground/90 to-primary/80 bg-clip-text text-transparent">
            DD's Home Kitchen
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          <Link to="/" className={navItemClass("/")}>Menu</Link>
          <Link to="/schedule" className={navItemClass("/schedule")}>Schedule</Link>
          {user && <Link to="/orders" className={navItemClass("/orders")}>Orders</Link>}
          {role === "manager" && (
            <Link to="/manager" className={navItemClass("/manager")}>
              <LayoutDashboard className="h-4 w-4" /> Analytics
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-2xl hover:bg-muted/50 transition-colors">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {user && (
            <Button variant="ghost" size="icon" className="relative rounded-2xl hover:bg-muted/50 transition-colors" onClick={() => navigate("/cart")}>
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black border-2 border-background animate-in zoom-in">
                  {totalItems}
                </span>
              )}
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-muted/50">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 min-w-[180px] shadow-2xl border-white/20">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl h-10 gap-3 cursor-pointer">
                  <User className="h-4 w-4 opacity-70" /> Profile
                </DropdownMenuItem>
                {role === "manager" && (
                  <DropdownMenuItem onClick={() => navigate("/manager")} className="rounded-xl h-10 gap-3 cursor-pointer text-primary bg-primary/5 font-medium">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()} className="rounded-xl h-10 gap-3 cursor-pointer text-destructive focus:bg-destructive/10">
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} className="rounded-2xl h-10 px-6 font-bold shadow-lg shadow-primary/20">Sign In</Button>
          )}
        </div>
      </div>
      <ProfileReminder />
    </header>
  );
};

export default Header;
