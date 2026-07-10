import { useState } from "react";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { ChevronLeft, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Feedback() {
  const [content, setContent] = useState("");
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const mutation = useSubmitFeedback({
    mutation: {
      onSuccess: () => { setDone(true); setContent(""); },
      onError: () => toast({ title: "送信に失敗しました", variant: "destructive" }),
    },
  });

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href="/my" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> マイページ
        </Link>
        <h1 className="text-xl font-serif font-bold mb-1">フィードバック</h1>
        <p className="text-sm text-muted-foreground mb-6">ご意見・ご要望・不具合報告などをお聞かせください</p>

        {done ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-lg font-semibold mb-2">ありがとうございます！</h2>
            <p className="text-sm text-muted-foreground mb-4">フィードバックを受け取りました。改善に活かします。</p>
            <Button variant="outline" onClick={() => setDone(false)}>もう一件送る</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/40 rounded-xl p-4 flex items-start gap-3">
              <MessageSquare size={18} className="text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p>・機能についての要望</p>
                <p>・使いにくい点</p>
                <p>・バグ・不具合の報告</p>
                <p>・その他なんでもどうぞ</p>
              </div>
            </div>

            <Textarea
              placeholder="フィードバックを入力してください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="text-sm"
            />

            <Button
              onClick={() => mutation.mutate({ data: { content } as any })}
              disabled={!content.trim() || mutation.isPending}
              className="w-full h-12"
            >
              {mutation.isPending ? "送信中..." : "送信する"}
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
