import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, PlusCircle, User } from "lucide-react";
import { Show } from "@clerk/react";

export function MobileLayout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background w-full flex justify-center text-foreground font-sans">
      <div className="w-full max-w-[430px] bg-background shadow-md shadow-black/5 relative flex flex-col">
        <main className={`flex-1 overflow-y-auto ${hideNav ? "" : "pb-20"}`}>
          {children}
        </main>
        
        {!hideNav && (
          <Show when="signed-in">
            <nav className="absolute bottom-0 w-full h-[64px] bg-background/90 backdrop-blur border-t border-border flex items-center justify-around px-4 pb-safe">
              <Link href="/events" className={`flex flex-col items-center gap-1 p-2 ${location === "/events" ? "text-primary" : "text-muted-foreground"}`}>
                <Home size={24} strokeWidth={1.5} />
                <span className="text-[10px]">一覧</span>
              </Link>
              <Link href="/events/new" className={`flex flex-col items-center gap-1 p-2 ${location === "/events/new" ? "text-primary" : "text-muted-foreground"}`}>
                <PlusCircle size={24} strokeWidth={1.5} />
                <span className="text-[10px]">ひらく</span>
              </Link>
              <Link href="/my" className={`flex flex-col items-center gap-1 p-2 ${location === "/my" ? "text-primary" : "text-muted-foreground"}`}>
                <User size={24} strokeWidth={1.5} />
                <span className="text-[10px]">マイページ</span>
              </Link>
            </nav>
          </Show>
        )}
      </div>
    </div>
  );
}
