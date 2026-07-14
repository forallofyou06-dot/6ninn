import { useState, useEffect } from "react";
import { useGetEvent, useUpdateEvent, getGetEventQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";

const PRESET_TAGS = ["食", "映画", "読書", "音楽", "旅", "スポーツ", "テクノロジー", "アート", "韓国", "猫", "歴史", "ゲーム", "料理"];

export default function EditEvent() {
  const params = useParams();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: event } = useGetEvent(id, { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } });

  const [theme, setTheme] = useState("");
  const [subTheme, setSubTheme] = useState("");
  const [datetime, setDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [fee, setFee] = useState(0);
  const [capacity, setCapacity] = useState(6);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (event) {
      setTheme(event.theme);
      setSubTheme(event.subTheme ?? "");
      const d = new Date(event.datetime);
      setDatetime(format(d, "yyyy-MM-dd'T'HH:mm"));
      setDurationMinutes(event.durationMinutes);
      setLocation(event.location);
      setLocationUrl(event.locationUrl ?? "");
      setFee(event.fee);
      setCapacity(event.capacity);
      setDeadline(event.deadline);
      setNotes(event.notes ?? "");
      setSelectedTags(event.tags);
    }
  }, [event]);

  const updateMutation = useUpdateEvent({
    mutation: {
      onSuccess: () => { toast({ title: "会を更新しました" }); navigate(`/events/${id}`); },
      onError: (e: any) => toast({ title: e?.message || "エラーが発生しました", variant: "destructive" }),
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) { toast({ title: "締切日を入力してください", variant: "destructive" }); return; }
    if (deadline > datetime.slice(0, 10)) { toast({ title: "申込締切日は開催日以前にしてください", variant: "destructive" }); return; }
    if (fee > 5000) { toast({ title: "会費は5,000円以内にしてください", variant: "destructive" }); return; }
    if (capacity < 3 || capacity > 6) { toast({ title: "定員は3〜6人にしてください", variant: "destructive" }); return; }
    if (durationMinutes > 120) { toast({ title: "開催時間は2時間以内にしてください", variant: "destructive" }); return; }
    updateMutation.mutate({
      id,
      data: { theme, subTheme: subTheme || undefined, datetime, durationMinutes, location, locationUrl: locationUrl || undefined, fee, capacity, minParticipants: 3, deadline, notes: notes || undefined, tags: selectedTags } as any,
    });
  };

  if (!event) return <MobileLayout><div className="p-4 text-muted-foreground text-sm">読み込み中...</div></MobileLayout>;
  if (!event.isHost) return <MobileLayout><div className="p-8 text-center text-muted-foreground">編集権限がありません</div></MobileLayout>;

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href={`/events/${id}`} className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> 詳細に戻る
        </Link>
        <h1 className="text-xl font-serif font-bold mb-6">会を編集</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>テーマ <span className="text-destructive">*</span></Label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} maxLength={50} required />
          </div>
          <div className="space-y-1.5">
            <Label>サブタイトル（任意）</Label>
            <Input value={subTheme} onChange={(e) => setSubTheme(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label className="mb-2 block">タグ</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-sm px-3 py-1 rounded-full border ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>開催日時</Label>
            <Input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>開催時間（分）</Label>
            <div className="flex gap-2">
              {[30, 60, 90, 120].map((m) => (
                <button key={m} type="button" onClick={() => setDurationMinutes(m)}
                  className={`text-sm px-3 py-1.5 rounded-md border ${durationMinutes === m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{m}分</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>場所</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>場所のURL（任意）</Label>
            <Input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>参加費（円）</Label>
              <Input type="number" min={0} max={5000} step={100} value={fee} onChange={(e) => setFee(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>定員（人）</Label>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setCapacity(n)}
                    className={`flex-1 text-sm py-2 rounded-md border ${capacity === n ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium">最低催行人数</p>
                <p className="text-xs text-muted-foreground">主催者を含めて3人以上で開催確定</p>
              </div>
              <span className="text-base font-bold text-primary">3人固定</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>申込締切日</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} max={datetime.slice(0, 10) || undefined} required />
            <p className="text-xs text-muted-foreground">この日の23:59まで申し込めます</p>
          </div>
          <div className="space-y-1.5">
            <Label>その他注意事項（任意）</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={updateMutation.isPending} className="w-full h-12">
            {updateMutation.isPending ? "保存中..." : "変更を保存する"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
