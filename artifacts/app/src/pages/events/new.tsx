import { useCreateEvent, getListEventsQueryKey, getListMyHostedEventsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const MAX_DURATION_MS = 2 * 60 * 60 * 1000;

const schema = z.object({
  theme: z.string().min(1, "テーマを入力してください"),
  subTheme: z.string().optional(),
  dateStart: z.string().min(1, "開始日時を入力してください"),
  dateEnd: z.string().min(1, "終了日時を入力してください"),
  location: z.string().min(1, "場所を入力してください"),
  locationUrl: z.string().optional(),
  fee: z.coerce.number().min(0).max(5000, "会費は5000円以内"),
  capacity: z.coerce.number().min(1).max(6, "定員は6人以内"),
}).refine((d) => {
  const diff = new Date(d.dateEnd).getTime() - new Date(d.dateStart).getTime();
  return diff > 0 && diff <= MAX_DURATION_MS;
}, { message: "終了時刻は開始から2時間以内にしてください", path: ["dateEnd"] });

type FormData = z.infer<typeof schema>;

export default function EventNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fee: 0, capacity: 6 },
  });

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: (event) => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyHostedEventsQueryKey() });
        toast({ title: "会をひらきました" });
        setLocation(`/events/${event.id}`);
      },
      onError: () => toast({ title: "エラーが発生しました", variant: "destructive" }),
    },
  });

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const onSubmit = (data: FormData) => {
    createEvent.mutate({
      data: {
        theme: data.theme,
        subTheme: data.subTheme || undefined,
        dateStart: new Date(data.dateStart).toISOString(),
        dateEnd: new Date(data.dateEnd).toISOString(),
        location: data.location,
        locationUrl: data.locationUrl || undefined,
        fee: data.fee,
        capacity: data.capacity,
        tags,
      },
    });
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-8">
        <Link href="/events" className="inline-flex items-center text-sm text-muted-foreground mb-6">
          <ChevronLeft size={16} /> 戻る
        </Link>
        <h1 className="text-xl font-serif font-bold mb-6">会をひらく</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="theme">テーマ</Label>
            <Input id="theme" placeholder="例: Seoulの楽しみ方" {...register("theme")} data-testid="input-theme" />
            {errors.theme && <p className="text-xs text-destructive">{errors.theme.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subTheme">× キーワード（任意）</Label>
            <Input id="subTheme" placeholder="例: 韓国料理" {...register("subTheme")} data-testid="input-subtheme" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateStart">開始日時</Label>
              <Input id="dateStart" type="datetime-local" {...register("dateStart")} data-testid="input-date-start" />
              {errors.dateStart && <p className="text-xs text-destructive">{errors.dateStart.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateEnd">終了日時</Label>
              <Input id="dateEnd" type="datetime-local" {...register("dateEnd")} data-testid="input-date-end" />
              {errors.dateEnd && <p className="text-xs text-destructive">{errors.dateEnd.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">場所</Label>
            <Input id="location" placeholder="例: soban 韓国創作料理" {...register("location")} data-testid="input-location" />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="locationUrl">場所リンク（任意）</Label>
            <Input id="locationUrl" type="url" placeholder="https://..." {...register("locationUrl")} data-testid="input-location-url" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee">会費 (¥) <span className="text-xs text-muted-foreground">5000円以内</span></Label>
              <Input id="fee" type="number" min={0} max={5000} {...register("fee")} data-testid="input-fee" />
              {errors.fee && <p className="text-xs text-destructive">{errors.fee.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">定員 <span className="text-xs text-muted-foreground">6人以内</span></Label>
              <Input id="capacity" type="number" min={1} max={6} {...register("capacity")} data-testid="input-capacity" />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>タグ</Label>
            <div className="flex gap-2">
              <Input
                placeholder="食, 映画, 読書..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                data-testid="input-tag"
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag} data-testid="button-add-tag">
                <Plus size={16} />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} data-testid={`button-remove-tag-${t}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>6人以内 · 2時間以内 · 5000円以内</p>
          </div>

          <Button type="submit" className="w-full" disabled={createEvent.isPending} data-testid="button-submit-event">
            {createEvent.isPending ? "送信中..." : "この内容でひらく"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
