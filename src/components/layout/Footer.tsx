import { Link } from "react-router-dom";
import { ChefHat, Phone, MapPin, Mail, Camera, ArrowUpRight, MessageCircle, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
    const phoneNumber = "750033196";
    const paymentNumber = "7904935160";
    const address = "102, Whitefield Grand, Marudhupandiyar Street, Chitlapakkam, Chennai-64";
    const mapLink = "https://maps.app.goo.gl/9TaGiWKphrthCvKD8";

    return (
        <footer className="bg-card border-t py-12 mt-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-20 -left-20 w-64 h-64 bg-primary rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.04, 0.07, 0.04] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-0 right-0 w-72 h-72 bg-orange-400 rounded-full blur-3xl"
                />
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* Logo and Description */}
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-6 group">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="bg-primary/10 p-2 rounded-2xl group-hover:bg-primary transition-colors"
                            >
                                <ChefHat className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                            </motion.div>
                            <span className="text-xl font-serif font-black tracking-tight">DD's Home Kitchen</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Premium homemade meals crafted with love and fresh ingredients. Experience authentic taste delivered to your doorstep.
                        </p>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200/50"
                        >
                            <div className="flex items-start gap-2">
                                <Camera className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">Disclaimer:</span> Food images are for reference only. The actual presentation may vary.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold mb-4 text-sm uppercase tracking-wider relative inline-block">
                            Quick Links
                            <motion.span 
                                layoutId="footer-underline"
                                className="absolute -bottom-1 left-0 h-0.5 bg-primary"
                                style={{ width: "40%" }}
                            />
                        </h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {[
                                { to: "/", label: "Today's Menu" },
                                { to: "/schedule", label: "Weekly Schedule" },
                                { to: "/orders", label: "My Orders" },
                                { to: "/profile", label: "My Profile" }
                            ].map((link) => (
                                <li key={link.to}>
                                    <Link 
                                        to={link.to} 
                                        className="group flex items-center gap-2 hover:text-primary transition-colors"
                                    >
                                        <motion.span 
                                            whileHover={{ x: 4 }}
                                            className="flex items-center gap-2"
                                        >
                                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity -rotate-45" />
                                            {link.label}
                                        </motion.span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="font-bold mb-4 text-sm uppercase tracking-wider relative inline-block">
                            Contact Us
                            <motion.span 
                                layoutId="footer-underline-2"
                                className="absolute -bottom-1 left-0 h-0.5 bg-primary"
                                style={{ width: "50%" }}
                            />
                        </h3>
                        <ul className="space-y-4">
                            <li>
                                <motion.a 
                                    href={`tel:+91${phoneNumber}`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/5 transition-colors group"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 group-hover:bg-green-500 transition-colors">
                                        <Phone className="h-4 w-4 text-green-600 dark:text-green-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Call Us</p>
                                        <span className="font-bold text-foreground">+91 {phoneNumber}</span>
                                    </div>
                                </motion.a>
                            </li>
                            <li>
                                <motion.div 
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/5 transition-colors group cursor-not-allowed opacity-70 hover:opacity-100"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Payment (UPI)</p>
                                        <span className="font-bold text-foreground">+91 {paymentNumber}</span>
                                    </div>
                                </motion.div>
                            </li>
                            <li>
                                <motion.a 
                                    href={mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-primary/5 transition-colors group"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 group-hover:bg-red-500 transition-colors">
                                        <MapPin className="h-4 w-4 text-red-600 dark:text-red-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Visit Us</p>
                                        <span className="text-sm font-medium text-foreground line-clamp-2">{address}</span>
                                        <motion.span 
                                            whileHover={{ x: 3 }}
                                            className="text-xs text-primary flex items-center gap-1 mt-1 font-semibold"
                                        >
                                            Get Directions <ArrowUpRight className="h-3 w-3 -rotate-45" />
                                        </motion.span>
                                    </div>
                                </motion.a>
                            </li>
                        </ul>
                    </div>

                    {/* Social Media */}
                    <div>
                        <h3 className="font-bold mb-4 text-sm uppercase tracking-wider relative inline-block">
                            Connect With Us
                            <motion.span 
                                layoutId="footer-underline-3"
                                className="absolute -bottom-1 left-0 h-0.5 bg-primary"
                                style={{ width: "50%" }}
                            />
                        </h3>
                        <div className="flex gap-3">
                            <motion.a 
                                href={`https://wa.me/91${paymentNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.1, y: -3 }}
                                whileTap={{ scale: 0.95 }}
                                className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white shadow-md"
                            >
                                <MessageCircle className="h-5 w-5" />
                            </motion.a>
                        </div>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-2xl"
                        >
                            <p className="text-xs text-muted-foreground italic text-center">
                                Made with love for our valued customers
                            </p>
                        </motion.div>
                    </div>
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="border-t mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4"
                >
                    <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} DD's Home Kitchen. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Questions?</span>
                        <motion.a 
                            href={`https://wa.me/91${paymentNumber}`}
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-1 text-primary font-semibold hover:underline"
                        >
                            <MessageCircle className="h-3 w-3" />
                            Chat on WhatsApp
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

export default Footer;
