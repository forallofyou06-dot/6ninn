import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, PlusCircle, User, Bell } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

function NotificationBell() {
  const { data: notifications } = useListNotifications();
  const unread = notifications?.filter((n: any) => !n.isRead).length ?? 0;
  const [location] = useLocation();
  return (
    <Link href="/notifications" className={`flex flex-col items-center gap-1 p-2 relative ${location === "/notifications" ? "text-primary" : "text-muted-foreground"}`}>
      <div className="relative">
        <Bell size={24} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      <span className="text-[10px]">通知</span>
    </Link>
  );
}

export function MobileLayout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background w-full flex justify-center text-foreground font-sans">
      <div className="w-full max-w-[430px] bg-background shadow-md shadow-black/5 relative flex flex-col">
        <main className={`flex-1 overflow-y-auto ${hideNav ? "" : "pb-20"}`}>
          {children}
        </main>

        {!hideNav && user && (
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[64px] bg-background/90 backdrop-blur border-t border-border flex items-center justify-around px-4 pb-safe z-50">
              <Link href="/events" className={`flex flex-col items-center gap-1 p-2 ${location === "/events" ? "text-primary" : "text-muted-foreground"}`}>
                <Home size={24} strokeWidth={1.5} />
                <span className="text-[10px]">一覧</span>
              </Link>
              <Link href="/events/new" className={`flex flex-col items-center gap-1 p-2 ${location === "/events/new" ? "text-primary" : "text-muted-foreground"}`}>
                <PlusCircle size={24} strokeWidth={1.5} />
                <span className="text-[10px]">ひらく</span>
              </Link>
              <NotificationBell />
              <Link href="/my" className={`flex flex-col items-center gap-1 p-2 ${location === "/my" ? "text-primary" : "text-muted-foreground"}`}>
                <User size={24} strokeWidth={1.5} />
                <span className="text-[10px]">マイページ</span>
              </Link>
            </nav>
        )}
      </div>
    </div>
  );
}
