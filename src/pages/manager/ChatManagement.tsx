import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ChatManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState<Record<string, string>>({});

  const { data: messages = [] } = useQuery({
    queryKey: ["all-chats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles:sender_id(name, email)")
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Group messages by sender
  const grouped = messages.reduce((acc: Record<string, any[]>, msg: any) => {
    const key = msg.is_from_customer ? msg.sender_id : (msg as any).receiver_id || msg.sender_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const sendReply = useMutation({
    mutationFn: async (senderId: string) => {
      const text = reply[senderId]?.trim();
      if (!text) return;
      const { error } = await supabase.from("chat_messages").insert({
        sender_id: user!.id,
        message: text,
        is_from_customer: false,
      });
      if (error) throw error;
    },
    onSuccess: (_, senderId) => {
      setReply({ ...reply, [senderId]: "" });
      queryClient.invalidateQueries({ queryKey: ["all-chats"] });
    },
    onError: () => toast.error("Failed to send"),
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Customer Messages</h2>
      <div className="space-y-4">
        {Object.entries(grouped).map(([senderId, msgs]) => {
          const customerMsg = (msgs as any[]).find((m: any) => m.is_from_customer);
          const customerName = customerMsg?.profiles?.name || customerMsg?.profiles?.email || "Customer";
          return (
            <Card key={senderId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold">{customerName}</span>
                  <Badge variant="outline" className="text-[10px]">{(msgs as any[]).length} messages</Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {(msgs as any[]).map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.is_from_customer ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.is_from_customer ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                        {msg.message}
                        <div className="text-[10px] opacity-70 mt-1">{format(new Date(msg.created_at), "h:mm a")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={reply[senderId] || ""}
                    onChange={(e) => setReply({ ...reply, [senderId]: e.target.value })}
                    placeholder="Reply..."
                    className="min-h-[40px] h-10 resize-none text-sm"
                  />
                  <Button size="icon" onClick={() => sendReply.mutate(senderId)} disabled={!reply[senderId]?.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {Object.keys(grouped).length === 0 && <p className="text-center text-muted-foreground py-8">No messages yet</p>}
      </div>
    </div>
  );
};

export default ChatManagement;
