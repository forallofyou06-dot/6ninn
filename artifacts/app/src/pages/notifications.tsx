import { useListNotifications, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const queryClient = useQueryClient();
  const markAllMutation = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) },
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif font-bold">通知</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="text-xs text-primary">
              <CheckCheck size={14} className="mr-1" />すべて既読
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-muted h-16 rounded-xl"/>)}</div>
        ) : !notifications?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className={`rounded-xl p-4 border transition-colors ${n.isRead ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm flex-1 ${n.isRead ? "text-foreground" : "font-medium"}`}>{n.content}</p>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ja })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
