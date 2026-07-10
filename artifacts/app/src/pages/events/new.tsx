import { useState } from "react";
import { useCreateEvent } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Info } from "lucide-react";

const PRESET_TAGS = ["食", "映画", "読書", "音楽", "旅", "スポーツ", "テクノロジー", "アート", "韓国", "猫", "歴史", "ゲーム", "料理"];

export default function NewEvent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [theme, setTheme] = useState("");
  const [subTheme, setSubTheme] = useState("");
  const [datetime, setDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [fee, setFee] = useState(0);
  const [capacity, setCapacity] = useState(6);
  const [minParticipants, setMinParticipants] = useState(2);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: (event: any) => {
        toast({ title: "会を作成しました！参加者を募集中です" });
        navigate(`/events/${event.id}`);
      },
      onError: (e: any) => toast({ title: e?.message || "エラーが発生しました", variant: "destructive" }),
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) { toast({ title: "テーマを入力してください", variant: "destructive" }); return; }
    if (!datetime) { toast({ title: "日時を入力してください", variant: "destructive" }); return; }
    if (!location.trim()) { toast({ title: "場所を入力してください", variant: "destructive" }); return; }
    if (!deadline) { toast({ title: "締切日を入力してください", variant: "destructive" }); return; }
    if (fee > 5000) { toast({ title: "会費は5,000円以内にしてください", variant: "destructive" }); return; }
    if (capacity < 3 || capacity > 6) { toast({ title: "定員は3〜6人にしてください", variant: "destructive" }); return; }
    if (durationMinutes > 120) { toast({ title: "開催時間は2時間以内にしてください", variant: "destructive" }); return; }
    createMutation.mutate({
      data: {
        theme: theme.trim(),
        subTheme: subTheme.trim() || undefined,
        datetime, durationMinutes, location: location.trim(),
        locationUrl: locationUrl.trim() || undefined,
        fee, capacity, minParticipants, deadline,
        notes: notes.trim() || undefined,
        tags: selectedTags,
      } as any,
    });
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href="/events" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> 一覧に戻る
        </Link>
        <h1 className="text-xl font-serif font-bold mb-1">会をひらく</h1>
        <p className="text-sm text-muted-foreground mb-6">最大6人・2時間以内・5,000円以内</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="theme">テーマ <span className="text-destructive">*</span></Label>
            <Input id="theme" placeholder="例: 映画好きと語る会" value={theme} onChange={(e) => setTheme(e.target.value)} maxLength={50} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subTheme">サブタイトル（任意）</Label>
            <Input id="subTheme" placeholder="例: 今月観た映画について話しましょう" value={subTheme} onChange={(e) => setSubTheme(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label className="mb-2 block">タグ（任意・複数選択可）</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="datetime">開催日時 <span className="text-destructive">*</span></Label>
              <Input id="datetime" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">開催時間（分）</Label>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map((m) => (
                  <button key={m} type="button" onClick={() => setDurationMinutes(m)}
                    className={`text-xs px-2 py-1.5 rounded-md border ${durationMinutes === m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{m}分</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">締切日 <span className="text-destructive">*</span></Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">場所 <span className="text-destructive">*</span></Label>
            <Input id="location" placeholder="例: 社内カフェテリア A席" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locationUrl">場所のURL（任意）</Label>
            <Input id="locationUrl" placeholder="https://maps.google.com/..." value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee">参加費（円）</Label>
              <Input id="fee" type="number" min={0} max={5000} step={100} value={fee} onChange={(e) => setFee(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">最大5,000円</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">定員（人）</Label>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setCapacity(n)}
                    className={`flex-1 text-sm py-2 rounded-md border ${capacity === n ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>最低実行人数</Label>
              <div className="flex gap-1">
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => setMinParticipants(n)}
                    className={`flex-1 text-sm py-2 rounded-md border ${minParticipants === n ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">その他注意事項（任意）</Label>
            <Textarea id="notes" placeholder="例: 社食のみ注文可・飲み物持参OK" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl text-xs text-muted-foreground">
            <Info size={14} className="text-primary mt-0.5 shrink-0" />
            <p>最低実行人数を下回った場合は締切日に自動でキャンセルとなります。参加者には通知が届きます。</p>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 text-base">
            {createMutation.isPending ? "作成中..." : "会をひらく"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
