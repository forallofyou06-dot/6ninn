import { useState } from "react";
import { useGetEvent, useApplyToEvent, useCancelParticipation, useListEventReports, useListEventParticipants, useCreateReport, useLikeReport, getGetEventQueryKey, getListEventsQueryKey, getListEventReportsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, MapPin, Users, Clock, Coins, ChevronLeft, Shield, Info, ExternalLink, Heart, Camera, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deadlineEndJst } from "@/lib/datetime";

function statusLabel(status: string) {
  if (status === "実施確定") return <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-700 rounded-full">✓ 実施確定</span>;
  if (status === "未実施") return <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">× 未実施（中止）</span>;
  if (status === "開催済") return <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">開催済</span>;
  return null;
}

export default function EventDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [reportTab, setReportTab] = useState<"reports" | "host">("reports");
  const [reportContent, setReportContent] = useState("");
  const [reportType, setReportType] = useState<"参加者感想" | "開催者報告">("参加者感想");
  const [photoUrl, setPhotoUrl] = useState("");

  const { data: event, isLoading } = useGetEvent(id, { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } });
  const { data: reports } = useListEventReports(id, { query: { enabled: !!id, queryKey: getListEventReportsQueryKey(id) } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
  };

  const apiError = (e: unknown) => {
    const msg = (e as any)?.response?.data?.error || (e as any)?.message || "エラーが発生しました";
    return msg as string;
  };

  const applyMutation = useApplyToEvent({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "申し込みました！" }); setShowCommentInput(false); setComment(""); }, onError: (e) => toast({ title: apiError(e), variant: "destructive" }) }
  });
  const cancelMutation = useCancelParticipation({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "キャンセルしました" }); }, onError: (e) => toast({ title: apiError(e), variant: "destructive" }) }
  });
  const createReportMutation = useCreateReport({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventReportsQueryKey(id) }); toast({ title: "投稿しました" }); setReportContent(""); setPhotoUrl(""); }, onError: (e) => toast({ title: apiError(e), variant: "destructive" }) }
  });
  const likeMutation = useLikeReport({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEventReportsQueryKey(id) }) }
  });

  if (isLoading) return <MobileLayout><div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="animate-pulse bg-muted h-16 rounded-xl"/>)}</div></MobileLayout>;
  if (!event) return <MobileLayout><div className="p-8 text-center text-muted-foreground">会が見つかりませんでした</div></MobileLayout>;

  const datetime = new Date(event.datetime);
  const endDatetime = new Date(datetime.getTime() + event.durationMinutes * 60000);
  const isPastDeadline = new Date() > deadlineEndJst(event.deadline);
  const isEnded = event.status === "開催済" || event.status === "未実施";
  const isFull = event.remainingSeats === 0 && !isEnded;
  const hostReports = reports?.filter(r => r.type === "開催者報告") ?? [];
  const participantReports = reports?.filter(r => r.type === "参加者感想") ?? [];

  const handleApply = () => {
    if (!showCommentInput) { setShowCommentInput(true); return; }
    applyMutation.mutate({ id, data: { comment: comment.trim() || undefined } });
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-32">
        <Link href="/events" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> 一覧に戻る
        </Link>

        {/* Tags & Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5 flex-wrap">
            {event.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {event.isDeadlineSoon && <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500 text-white rounded-full">締切間近</span>}
            {isFull && <span className="text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">満席</span>}
            {statusLabel(event.status)}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-serif font-bold mb-1">{event.theme}</h1>
        {event.subTheme && <p className="text-muted-foreground text-sm mb-4">{event.subTheme}</p>}

        {/* Rule badges */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1"><Shield size={10} />6人以内</span>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">2時間以内</span>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">5000円以内</span>
        </div>

        {/* Details */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
          <div className="flex gap-3 text-sm">
            <Calendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">日時</p>
              <p className="text-muted-foreground">{format(datetime, "yyyy年M月d日(E) HH:mm", { locale: ja })} 〜 {format(endDatetime, "HH:mm")}</p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">場所</p>
              <p className="text-muted-foreground">{event.location}</p>
              {event.locationUrl && (
                <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 mt-1 hover:underline">
                  <ExternalLink size={11} />地図・詳細を見る
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <Coins size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">参加費</p>
              <p className="text-muted-foreground">{event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}</p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <Users size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">定員・残席</p>
              <div className="flex items-center gap-2 mt-1">
                {Array.from({ length: event.capacity }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border ${i < event.participantsCount ? "bg-primary border-primary" : "bg-muted border-border"}`} />
                ))}
                <span className="text-xs text-muted-foreground">（{event.participantsCount}/{event.capacity}人）</span>
                {event.remainingSeats > 0 && !isPastDeadline && (
                  <span className="text-xs font-medium text-primary">あと{event.remainingSeats}席</span>
                )}
                {isFull && <span className="text-xs font-semibold text-rose-700">満席</span>}
              </div>
              <p className={`text-xs mt-1 ${event.isDeadlineSoon ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>最低催行人数: 3人（固定） · 申込締切: {event.deadline}</p>
            </div>
          </div>
          {event.notes && (
            <div className="flex gap-3 text-sm">
              <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">その他注意事項</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Host */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {(event.hostName || "?").charAt(0)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">主催者</p>
            <p className="text-sm font-medium">{event.hostName ?? "未設定"}</p>
            {event.hostDepartment && <p className="text-xs text-muted-foreground">{event.hostDepartment}</p>}
          </div>
          {event.isHost && (
            <Link href={`/events/${id}/edit`} className="ml-auto text-xs text-primary hover:underline">編集</Link>
          )}
        </div>

        {/* Reports section (for ended events) */}
        {isEnded && (
          <div className="mb-6">
            <h2 className="text-base font-serif font-semibold mb-3">開催レポート</h2>
            {hostReports.length > 0 && (
              <div className="mb-4 space-y-3">
                {hostReports.map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {r.photoUrl && (
                      <div className="aspect-video bg-muted">
                        <img src={r.photoUrl} alt="report" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1"><Camera size={12} />ホスト報告</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <button onClick={() => likeMutation.mutate({ id: r.id })} className={`flex items-center gap-1 text-xs ${r.isLiked ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors`}>
                          <Heart size={12} fill={r.isLiked ? "currentColor" : "none"} />
                          {r.likesCount}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {participantReports.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MessageSquare size={12} />参加者の感想</p>
                {participantReports.map(r => (
                  <div key={r.id} className="bg-secondary/40 rounded-xl p-3">
                    <p className="text-sm italic">「{r.content}」</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">— {r.authorName ?? "匿名"}</p>
                      <button onClick={() => likeMutation.mutate({ id: r.id })} className={`flex items-center gap-1 text-xs ${r.isLiked ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors`}>
                        <Heart size={11} fill={r.isLiked ? "currentColor" : "none"} />
                        {r.likesCount > 0 && r.likesCount}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {reports?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">まだレポートがありません</p>}
          </div>
        )}

        {/* Post report form for ended events */}
        {isEnded && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">感想・レポートを投稿</h3>
            <div className="flex gap-2 mb-3">
              {(["参加者感想", "開催者報告"] as const).map(t => (
                <button key={t} onClick={() => setReportType(t)} className={`text-xs px-3 py-1 rounded-full border ${reportType === t ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{t}</button>
              ))}
            </div>
            {reportType === "開催者報告" && (
              <div className="mb-3 space-y-1.5">
                <Label htmlFor="photo" className="text-xs">写真URL（任意）</Label>
                <Input id="photo" placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
              </div>
            )}
            <Textarea placeholder={reportType === "参加者感想" ? "ひとこと感想を入力..." : "開催の様子を報告..."} value={reportContent} onChange={e => setReportContent(e.target.value)} rows={3} className="mb-2" />
            <Button onClick={() => createReportMutation.mutate({ id, data: { type: reportType, content: reportContent, photoUrl: photoUrl || undefined } })} disabled={!reportContent.trim() || createReportMutation.isPending} className="w-full">
              {createReportMutation.isPending ? "投稿中..." : "投稿する"}
            </Button>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      {!isEnded && (
        <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-10 flex justify-center">
          <div className="w-full max-w-[430px] space-y-2">
            {event.isApplied ? (
              <>
                <p className="text-xs text-center text-primary font-medium">✓ 参加登録済みです</p>
                {!isPastDeadline && (
                  <Button variant="outline" className="w-full" onClick={() => cancelMutation.mutate({ id })} disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending ? "キャンセル中..." : "キャンセルする"}
                  </Button>
                )}
                {isPastDeadline && <p className="text-xs text-center text-muted-foreground">締切後のキャンセルはホストに直接ご連絡ください</p>}
              </>
            ) : event.remainingSeats > 0 && !isPastDeadline ? (
              <>
                {showCommentInput && (
                  <Textarea placeholder="ひとことコメント（任意）" value={comment} onChange={e => setComment(e.target.value)} rows={2} className="text-sm" />
                )}
                <Button className="w-full" onClick={handleApply} disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? "申込中..." : showCommentInput ? "申し込む" : "この席に申し込む（先着）"}
                </Button>
                {showCommentInput && <button onClick={() => setShowCommentInput(false)} className="text-xs text-muted-foreground w-full text-center">キャンセル</button>}
              </>
            ) : isPastDeadline ? (
              <Button disabled className="w-full">募集締め切り</Button>
            ) : (
              <Button disabled className="w-full">満席です</Button>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
