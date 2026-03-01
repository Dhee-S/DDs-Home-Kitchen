import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Phone, MapPin, Clock, Heart, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: "", phone: "", address: "", dietary_preference: "veg", preferred_pickup_time: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({
        name: data.name || "",
        phone: data.phone || "",
        address: data.address || "",
        dietary_preference: data.dietary_preference || "veg",
        preferred_pickup_time: data.preferred_pickup_time || "",
      });
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setLoading(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  const dietaryOptions = [
    { id: "veg", label: "Vegetarian", icon: "🥗", color: "bg-green-500", lightColor: "bg-green-50" },
    { id: "non-veg", label: "Non-Veg", icon: "🍗", color: "bg-red-500", lightColor: "bg-red-50" },
    { id: "both", label: "Both", icon: "🍱", color: "bg-orange-500", lightColor: "bg-orange-50" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-orange-500/10 blur-[100px] rounded-full"
        />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles className="h-3 w-3" /> Personalise Your Experience
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter mb-4">My Kitchen Profile</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            Update your details to help us serve you better home-cooked meals.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-2xl glass-card rounded-[3rem] overflow-hidden">
            <CardContent className="p-8 md:p-12 space-y-10">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-border/40">
                <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white shadow-xl shadow-primary/20 relative group overflow-hidden">
                  <User className="h-10 w-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-2xl font-serif font-bold">{profile.name || "Happy Chef"}</h2>
                  <p className="text-muted-foreground font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-8">
                {/* Basic Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Basic Details</Label>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 ml-1 text-xs font-bold"><User className="h-3 w-3 opacity-50" /> Full Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="rounded-2xl h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/10 px-5 text-base shadow-inner"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 ml-1 text-xs font-bold"><Phone className="h-3 w-3 opacity-50" /> Phone Number</Label>
                      <Input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="rounded-2xl h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/10 px-5 text-base shadow-inner"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 ml-1 text-xs font-bold"><MapPin className="h-3 w-3 opacity-50" /> Delivery Address</Label>
                    <Input
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="rounded-2xl h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/10 px-5 text-base shadow-inner"
                      placeholder="123, Kitchen Street, Foodie Lane"
                    />
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Dietary Preference</Label>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {dietaryOptions.map((opt) => (
                      <motion.div
                        key={opt.id}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setProfile({ ...profile, dietary_preference: opt.id })}
                        className={`cursor-pointer rounded-[2rem] p-4 text-center border-2 transition-all duration-300 relative group overflow-hidden ${profile.dietary_preference === opt.id
                            ? `border-primary shadow-xl shadow-primary/10 ${opt.lightColor} dark:bg-white/5`
                            : "border-transparent bg-background shadow-md hover:shadow-lg"
                          }`}
                      >
                        <div className={`h-12 w-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl shadow-inner ${profile.dietary_preference === opt.id ? opt.color + "/20 text-white" : "bg-muted/50"
                          }`}>
                          {opt.icon}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${profile.dietary_preference === opt.id ? "text-primary" : "text-muted-foreground"
                          }`}>
                          {opt.label}
                        </span>

                        <AnimatePresence>
                          {profile.dietary_preference === opt.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-lg"
                            >
                              <Check className="h-3 w-3 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Kitchen Preferences</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 ml-1 text-xs font-bold"><Clock className="h-3 w-3 opacity-50" /> Preferred Pickup/Delivery Time</Label>
                    <Input
                      value={profile.preferred_pickup_time}
                      onChange={(e) => setProfile({ ...profile, preferred_pickup_time: e.target.value })}
                      className="rounded-2xl h-14 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/10 px-5 text-base shadow-inner"
                      placeholder="E.g. 1:00 PM - 2:00 PM"
                    />
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full h-16 rounded-[1.75rem] gap-3 text-lg font-black shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all text-white"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Profile Changes
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Heart className="h-4 w-4 text-primary animate-pulse" />
          <span>Your data is safe with our kitchen.</span>
        </div>
      </div>
    </div>
  );
};

export default Profile;
