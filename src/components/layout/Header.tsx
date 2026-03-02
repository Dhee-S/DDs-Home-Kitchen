import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Sun, Moon, User, LogOut, ChefHat, LayoutDashboard, Menu, X, Home, Calendar, Package } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ProfileReminder from "./ProfileReminder";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const { user, role, signOut } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  const navItemClass = (path: string) => {
    const active = isActive(path);
    return `transition-all px-4 py-3 rounded-2xl text-base font-bold flex items-center gap-3 ${active
        ? "text-primary bg-primary/10 border border-primary/20 shadow-sm shadow-primary/5"
        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
      }`;
  };

  const MobileNavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      className={navItemClass(to)}
    >
      <Icon className="h-5 w-5" />
      {label}
      {to === "/cart" && totalItems > 0 && (
        <Badge className="ml-auto bg-primary text-white text-[10px] px-2">{totalItems}</Badge>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/10 dark:border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 pt-16">
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2 px-4 pb-6"
                >
                  <MobileNavLink to="/" icon={Home} label="Menu" />
                  <MobileNavLink to="/schedule" icon={Calendar} label="Schedule" />
                  {user && <MobileNavLink to="/orders" icon={Package} label="Orders" />}
                  {user && <MobileNavLink to="/cart" icon={ShoppingCart} label={`Cart (${totalItems})`} />}
                  {role === "manager" && <MobileNavLink to="/manager" icon={LayoutDashboard} label="Dashboard" />}
                  {user && <MobileNavLink to="/profile" icon={User} label="Profile" />}
                  
                  {user && (
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="w-full transition-all px-4 py-3 rounded-2xl text-base font-bold flex items-center gap-3 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-2 group transition-all">
            <div className="bg-primary/90 p-1 rounded-lg sm:rounded-2xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-base sm:text-xl font-serif font-black tracking-tighter bg-gradient-to-br from-foreground via-foreground/90 to-primary/80 bg-clip-text text-transparent">
              DD's Kitchen
            </span>
          </Link>
        </div>

        {/* Desktop Logo */}
        <Link to="/" className="hidden md:flex items-center gap-2 group transition-all">
          <div className="bg-primary/90 p-1.5 rounded-2xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-serif font-black tracking-tighter bg-gradient-to-br from-foreground via-foreground/90 to-primary/80 bg-clip-text text-transparent">
            DD's Home Kitchen
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4">
          <Link to="/" className={navItemClass("/")}>Menu</Link>
          <Link to="/schedule" className={navItemClass("/schedule")}>Schedule</Link>
          {user && <Link to="/orders" className={navItemClass("/orders")}>Orders</Link>}
          {role === "manager" && (
            <Link to="/manager" className={navItemClass("/manager")}>
              <LayoutDashboard className="h-4 w-4" /> Analytics
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl hover:bg-muted/50 h-9 w-9 sm:h-10 sm:w-10">
            {theme === "light" ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          {user && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative rounded-xl hover:bg-muted/50 h-9 w-9 sm:h-10 sm:w-10" 
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
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
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 h-9 w-9 sm:h-10 sm:w-10">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <Button onClick={() => navigate("/auth")} className="rounded-xl sm:rounded-2xl h-9 sm:h-10 px-4 sm:px-6 font-bold shadow-lg shadow-primary/20 text-sm sm:text-base">
              Sign In
            </Button>
          )}
        </div>
      </div>
      <ProfileReminder />
    </header>
  );
};

export default Header;
