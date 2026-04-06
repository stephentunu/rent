import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { notificationsApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unread = (notifications || []).filter((n: any) => !n.is_read).length;

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      await notificationsApi.markRead(n.id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-0 px-1 text-xs text-primary" onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {!notifications || notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {(notifications as any[]).map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className={!n.is_read ? "" : "pl-4"}>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
