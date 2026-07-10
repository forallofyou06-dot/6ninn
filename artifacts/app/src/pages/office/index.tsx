import { useGetOfficeKpi, useListOfficeFeedbacks } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { ChevronLeft, Download, BarChart3, Users, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: number; icon: any; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function OfficeDashboard() {
  const { data: kpi, isLoading: kpiLoading } = useGetOfficeKpi();
  const { data: feedbacks, isLoading: fbLoading } = useListOfficeFeedbacks();

  const downloadCsv = () => {
    const link = document.createElement("a");
    link.href = "/api/office/export/events";
    link.download = "events.csv";
    link.click();
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href="/my" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> マイページ
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-serif font-bold">事務局ダッシュボード</h1>
            <p className="text-xs text-muted-foreground mt-0.5">KPIと運営状況</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCsv} className="flex items-center gap-1.5 text-xs">
            <Download size={13} /> CSV
          </Button>
        </div>

        {kpiLoading ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="animate-pulse bg-muted h-24 rounded-xl"/>)}
          </div>
        ) : kpi ? (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart3 size={14} /> 累計実績
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <KpiCard label="総イベント数" value={kpi.totalEvents} icon={Calendar} />
              <KpiCard label="開催済み" value={kpi.completedEvents} icon={Calendar} sub={`中止 ${kpi.cancelledEvents}件`} />
              <KpiCard label="総参加のべ数" value={kpi.totalParticipants} icon={Users} />
              <KpiCard label="つながり数" value={kpi.totalConnectionPairs} icon={Users} sub="参加者同士のペア数" />
            </div>

            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp size={14} /> 今月
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <KpiCard label="今月の会" value={kpi.eventsThisMonth} icon={Calendar} />
              <KpiCard label="今月の参加" value={kpi.participantsThisMonth} icon={Users} />
            </div>

            {kpi.topTags.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold mb-3">人気タグ TOP10</h2>
                <div className="space-y-2">
                  {kpi.topTags.map((t: any, i: number) => (
                    <div key={t.tag} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i+1}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all"
                          style={{ width: `${Math.max(10, (t.count / kpi.topTags[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">#{t.tag}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{t.count}件</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <MessageSquare size={14} /> フィードバック一覧
        </h2>
        {fbLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-muted h-20 rounded-xl"/>)}</div>
        ) : !feedbacks?.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">フィードバックはまだありません</div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f: any) => (
              <div key={f.id} className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm leading-relaxed mb-2">{f.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.fromUserName ?? f.fromUserEmail}</span>
                  <span>{new Date(f.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
                {f.eventTheme && <p className="text-xs text-primary mt-1">会: {f.eventTheme}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
