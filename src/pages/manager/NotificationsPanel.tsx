import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { format } from "date-fns";

const NotificationsPanel = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Notifications</h2>
        {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
      </div>
      <div className="space-y-3">
        {notifications.map((n: any) => (
          <Card key={n.id} className={n.is_read ? "opacity-60" : ""}>
            <CardContent className="flex items-start gap-3 p-4">
              <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{n.title}</h3>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, h:mm a")}</span>
              </div>
              {!n.is_read && (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} className="shrink-0">
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && <p className="text-center text-muted-foreground py-8">No notifications</p>}
      </div>
    </div>
  );
};

export default NotificationsPanel;
