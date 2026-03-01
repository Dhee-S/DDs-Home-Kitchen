import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const ChatWidget = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user && open,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const payload: any = {
        sender_id: user!.id,
        user_id: user!.id,
        message: msg,
        sender_role: 'customer',
        is_from_customer: true, // Only if the SQL added it
      };
      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl border bg-card shadow-2xl overflow-hidden"
          >
            <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between">
              <span className="font-semibold">Chat with us</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/80 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-64 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center mt-8">Send us a message!</p>
              )}
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_from_customer ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.is_from_customer ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="min-h-[40px] h-10 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim()) sendMutation.mutate(message.trim());
                  }
                }}
              />
              <Button
                size="icon"
                disabled={!message.trim() || sendMutation.isPending}
                onClick={() => message.trim() && sendMutation.mutate(message.trim())}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </>
  );
};

export default ChatWidget;
