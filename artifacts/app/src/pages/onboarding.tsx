import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { joinFullName, splitFullName } from "@/lib/name";

const PRESET_TAGS = [
  "食", "映画", "読書", "音楽", "旅", "スポーツ", "アウトドア",
  "テクノロジー", "アート", "韓国", "歴史", "猫", "写真", "ゲーム", "料理",
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: profile } = useGetMe();
  const { toast } = useToast();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const updateMutation = useUpdateMe();

  useEffect(() => {
    if (profile?.name) {
      const parsed = profile.lastName && profile.firstName
        ? { lastName: profile.lastName, firstName: profile.firstName }
        : splitFullName(profile.name);
      setLastName(parsed.lastName);
      setFirstName(parsed.firstName);
    }
    if (profile?.department) setDepartment(profile.department);
    if (profile?.interestTags?.length) setTags(profile.interestTags);
  }, [profile]);

  const togglePreset = (t: string) => {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const addCustomTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      toast({ title: "苗字と名前を両方入力してください", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        data: { lastName, firstName, name: joinFullName(lastName, firstName), department: department.trim(), interestTags: tags },
      });
      toast({ title: "プロフィールを登録しました！" });
      setLocation("/events");
    } catch (e) {
      toast({ title: "エラーが発生しました。もう一度お試しください。", variant: "destructive" });
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-[100dvh] flex flex-col justify-center p-6">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold mb-2">はじめまして</h1>
          <p className="text-sm text-muted-foreground">
            プロフィールを登録して、会に参加しましょう。
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="last-name">
                苗字 <span className="text-destructive text-xs">必須</span>
              </Label>
              <Input
                id="last-name"
                placeholder="山田"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                maxLength={50}
                required
                data-testid="input-last-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first-name">
                名前 <span className="text-destructive text-xs">必須</span>
              </Label>
              <Input
                id="first-name"
                placeholder="太郎"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                maxLength={50}
                required
                data-testid="input-first-name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">所属（部署・フロアなど）</Label>
            <Input
              id="department"
              placeholder="例: 小売DX推進部 / 8F"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              data-testid="input-department"
            />
          </div>

          <div className="space-y-3">
            <Label>興味タグ（任意・複数選択可）</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => togglePreset(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    tags.includes(t)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/60"
                  }`}
                  data-testid={`tag-${t}`}
                >
                  #{t}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="その他のタグを追加..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCustomTag(); }
                }}
                data-testid="input-custom-tag"
              />
              <Button type="button" variant="outline" size="icon" onClick={addCustomTag}>
                <Plus size={16} />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 space-y-3 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              社内メールアドレスでの利用を推奨しています。<br />
              プロフィール情報は後からマイページで変更できます。
            </p>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !lastName.trim() || !firstName.trim()}
              data-testid="button-submit-profile"
            >
              {updateMutation.isPending ? "登録中..." : "はじめる →"}
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
