import { useListMyApplications, getListMyApplicationsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, isFuture } from "date-fns";

function StatusBadge({ status, dateStart }: { status: string; dateStart: string }) {
  const upcoming = isFuture(new Date(dateStart));
  if (status === "cancelled") return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">キャンセル済み</span>;
  if (upcoming) return <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">参加予定</span>;
  return <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">参加済み</span>;
}

export default function MyApplications() {
  const { data: applications, isLoading } = useListMyApplications({ query: { queryKey: getListMyApplicationsQueryKey() } });

  const upcoming = applications?.filter((a) => a.event && isFuture(new Date(a.event.dateStart)) && a.status === "active") ?? [];
  const past = applications?.filter((a) => !a.event || !isFuture(new Date(a.event.dateStart)) || a.status === "cancelled") ?? [];

  return (
    <MobileLayout>
      <div className="p-4">
        <Link href="/my" className="inline-flex items-center text-sm text-muted-foreground mb-6">
          <ChevronLeft size={16} /> マイページ
        </Link>
        <h1 className="text-xl font-serif font-bold mb-6">参加履歴</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-muted h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">今後の予定</h2>
                <div className="space-y-3">
                  {upcoming.map((app) => (
                    <ApplicationCard key={app.id} app={app} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">これまで</h2>
                <div className="space-y-3">
                  {past.map((app) => (
                    <ApplicationCard key={app.id} app={app} showReport />
                  ))}
                </div>
              </section>
            )}
            {applications?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">まだ参加した会がありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function ApplicationCard({ app, showReport }: { app: any; showReport?: boolean }) {
  const event = app.event;
  if (!event) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`application-card-${app.id}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm flex-1 pr-2">{event.theme}</h3>
        <StatusBadge status={app.status} dateStart={event.dateStart} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Calendar size={12} />
        <span>{format(new Date(event.dateStart), 'MM/dd HH:mm')}</span>
        <span>·</span>
        <span>{event.location}</span>
      </div>
      {showReport && app.status === "active" && (
        <Link href={`/events/${event.id}/report`} className="text-xs text-primary inline-flex items-center gap-1 hover:underline" data-testid={`link-report-${event.id}`}>
          レポートを見る <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}
