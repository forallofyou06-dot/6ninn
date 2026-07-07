import {
  useGetEventReport, useGetEvent, useCreateReport, useAddComment,
  getGetEventReportQueryKey, getGetEventQueryKey,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useUser } from "@clerk/react";
import { ChevronLeft, Image, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function EventReport() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event } = useGetEvent(id, { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } });
  const { data: report, isLoading } = useGetEventReport(id, { query: { enabled: !!id, queryKey: getGetEventReportQueryKey(id) } });

  const [reportText, setReportText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [commentText, setCommentText] = useState("");

  const createReport = useCreateReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventReportQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        toast({ title: "レポートを投稿しました" });
        setReportText(""); setPhotoUrl("");
      },
      onError: () => toast({ title: "エラーが発生しました", variant: "destructive" }),
    },
  });

  const addComment = useAddComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventReportQueryKey(id) });
        toast({ title: "感想を追加しました" });
        setCommentText("");
      },
      onError: () => toast({ title: "エラーが発生しました", variant: "destructive" }),
    },
  });

  return (
    <MobileLayout>
      <div className="p-4 pb-8">
        <Link href={`/events/${id}`} className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> 詳細に戻る
        </Link>
        <h1 className="text-lg font-serif font-bold mb-1">開催レポート</h1>
        {event && (
          <p className="text-sm text-muted-foreground mb-6">
            {format(new Date(event.dateStart), 'MM/dd')} 開催 · {event.theme}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="animate-pulse bg-muted h-24 rounded-xl" />)}
          </div>
        ) : report ? (
          <div className="space-y-6">
            {report.photoUrl && (
              <div className="rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                <img src={report.photoUrl} alt="開催レポート" className="object-cover w-full h-full" />
              </div>
            )}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.reportText}</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <MessageSquare size={14} /> 参加者の一言
              </h2>
              {report.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">まだ感想がありません</p>
              ) : (
                report.comments.map((c) => (
                  <div key={c.id} className="bg-secondary/50 rounded-xl p-3" data-testid={`comment-${c.id}`}>
                    <p className="text-sm italic">「{c.text}」</p>
                    <p className="text-xs text-muted-foreground mt-1">— {c.authorName}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="comment">ひとこと感想</Label>
              <Textarea
                id="comment"
                placeholder="一言感想を入力..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={200}
                rows={2}
                data-testid="input-comment"
              />
              <Button
                className="w-full"
                onClick={() => addComment.mutate({ id, data: { text: commentText } })}
                disabled={!commentText.trim() || addComment.isPending}
                data-testid="button-submit-comment"
              >
                感想を投稿する
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center py-6 text-muted-foreground">
              <Image size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">まだレポートがありません</p>
            </div>
            <div className="space-y-4 border-t border-border pt-5">
              <h2 className="font-semibold text-sm">ホスト用: レポートを投稿</h2>
              <div className="space-y-1.5">
                <Label htmlFor="photoUrl">写真URL（任意）</Label>
                <Input id="photoUrl" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} data-testid="input-photo-url" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportText">開催報告</Label>
                <Textarea id="reportText" placeholder="どんな会でしたか？" value={reportText} onChange={(e) => setReportText(e.target.value)} rows={5} data-testid="input-report-text" />
              </div>
              <Button
                className="w-full"
                onClick={() => createReport.mutate({ id, data: { reportText, photoUrl: photoUrl || undefined } })}
                disabled={!reportText.trim() || createReport.isPending}
                data-testid="button-submit-report"
              >
                レポートを投稿する
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
