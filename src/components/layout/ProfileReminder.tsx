import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UserCircle, X, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const ProfileReminder = () => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [show, setShow] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!user || role !== "customer" || isDismissed || location.pathname === "/profile") {
            setShow(false);
            return;
        }

        const checkProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("phone, address")
                .eq("id", user.id)
                .single();

            if (data && (!data.phone || !data.address)) {
                // Delay showing it slightly for better UX
                const timer = setTimeout(() => setShow(true), 3000);
                return () => clearTimeout(timer);
            }
        };

        checkProfile();
    }, [user, isDismissed, location.pathname]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
            >
                <div className="glass-card bg-card/80 backdrop-blur-2xl border border-primary/20 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    {/* Decorative background element */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-primary/10"
                        onClick={() => setIsDismissed(true)}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-2 pr-4">
                            <h3 className="font-serif font-black text-lg leading-tight">Complete Your Profile</h3>
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                Add your phone and address to enjoy faster checkouts and personalized deliveries!
                            </p>
                            <Button
                                onClick={() => navigate("/profile")}
                                className="mt-2 h-10 rounded-xl px-5 gap-2 font-bold shadow-lg shadow-primary/20"
                            >
                                Update Now <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProfileReminder;
