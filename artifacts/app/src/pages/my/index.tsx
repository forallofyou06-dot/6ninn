import { useGetMe, getGetMeQueryKey, useGetMyStats, getGetMyStatsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { User, Users, Calendar, ArrowRight } from "lucide-react";
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";

export default function MyPage() {
  const { data: me, isLoading: meLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: stats, isLoading: statsLoading } = useGetMyStats({ query: { queryKey: getGetMyStatsQueryKey() } });
  const { signOut } = useClerk();

  return (
    <MobileLayout>
      <div className="p-4 pb-8">
        <h1 className="text-xl font-serif font-bold mb-6">マイページ</h1>
        
        {meLoading || statsLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        ) : me && stats ? (
          <>
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm mb-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                {me.displayName.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold">{me.displayName}</h2>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {me.tags.map(tag => (
                    <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-card border border-border p-4 rounded-xl text-center shadow-sm">
                <p className="text-2xl font-bold text-primary mb-1">{stats.participated}</p>
                <p className="text-xs text-muted-foreground">参加</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center shadow-sm">
                <p className="text-2xl font-bold text-primary mb-1">{stats.hosted}</p>
                <p className="text-xs text-muted-foreground">主催</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl text-center shadow-sm">
                <p className="text-2xl font-bold text-primary mb-1">{stats.connections}</p>
                <p className="text-xs text-muted-foreground">つながり</p>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/my/applications">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-muted-foreground" />
                    <span className="font-medium">参加履歴</span>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </div>
              </Link>
            </div>
            
            <div className="mt-12 text-center">
              <Button variant="ghost" className="text-muted-foreground" onClick={() => signOut({ redirectUrl: '/' })}>
                ログアウト
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </MobileLayout>
  );
}
