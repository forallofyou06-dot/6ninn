import { useState } from "react";
import { useGetMe, useUpdateMe, useGetMyStats, getGetMeQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Users, Calendar, Award, ChevronRight, Edit3, LogOut } from "lucide-react";
import { useClerk } from "@clerk/react";

const PRESET_TAGS = ["食", "映画", "読書", "音楽", "旅", "スポーツ", "テクノロジー", "アート", "韓国", "猫", "歴史", "ゲーム", "料理"];

export default function MyPage() {
  const { data: me } = useGetMe();
  const { data: stats } = useGetMyStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clerk = useClerk();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [department, setDepartment] = useState(me?.department ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(me?.interestTags ?? []);

  const updateMutation = useUpdateMe({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditing(false);
        toast({ title: "プロフィールを更新しました" });
      },
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSave = () => {
    updateMutation.mutate({ data: { name: name.trim() || undefined, department: department.trim() || undefined, interestTags: selectedTags } });
  };

  const initEdit = () => {
    setName(me?.name ?? "");
    setDepartment(me?.department ?? "");
    setSelectedTags(me?.interestTags ?? []);
    setEditing(true);
  };

  if (!me) return null;

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-serif font-bold">マイページ</h1>
          <button onClick={() => clerk.signOut().then(() => { window.location.href = "/"; })} className="text-sm text-muted-foreground flex items-center gap-1">
            <LogOut size={14} /> サインアウト
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>お名前</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" />
              </div>
              <div className="space-y-1.5">
                <Label>部署・チーム</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="エンジニアリング" />
              </div>
              <div>
                <Label className="mb-2 block">興味タグ</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`text-sm px-2.5 py-1 rounded-full border transition-colors ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? "保存中..." : "保存する"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">キャンセル</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {(me.name || me.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{me.name ?? "（名前未設定）"}</p>
                    <p className="text-sm text-muted-foreground">{me.email}</p>
                    {me.department && <p className="text-xs text-muted-foreground">{me.department}</p>}
                  </div>
                </div>
                <button onClick={initEdit} className="text-primary">
                  <Edit3 size={18} />
                </button>
              </div>
              {me.interestTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {me.interestTags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Calendar size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats?.participated ?? 0}</p>
            <p className="text-xs text-muted-foreground">参加した会</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Award size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats?.hosted ?? 0}</p>
            <p className="text-xs text-muted-foreground">開いた会</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Users size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats?.connections ?? 0}</p>
            <p className="text-xs text-muted-foreground">つながり</p>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[
            { href: "/my/applications", label: "参加履歴・申込中の会", icon: Calendar },
            { href: "/my/hosted", label: "ひらいた会", icon: Award },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-3 bg-card border border-border rounded-xl">
          <Link href="/feedback">
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer">
              <span className="text-sm font-medium">フィードバックを送る</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Link>
          <Link href="/rules">
            <div className="flex items-center justify-between p-4 border-t border-border hover:bg-muted/30 cursor-pointer">
              <span className="text-sm font-medium">ルール・ガイドライン</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </Link>
          {(me.role === "office" || me.role === "maintainer") && (
            <Link href="/office">
              <div className="flex items-center justify-between p-4 border-t border-border hover:bg-muted/30 cursor-pointer">
                <span className="text-sm font-medium text-primary">事務局ダッシュボード</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
