import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const isSignUp = mode === "sign-up";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: isSignUp,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "認証メールを送信できませんでした",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-[100dvh] flex flex-col justify-center p-6">
        <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={15} /> 戻る
        </Link>
        <div className="w-full max-w-sm mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-5">
              <CheckCircle size={46} className="mx-auto mb-4 text-green-600" />
              <h1 className="font-serif text-xl font-bold mb-2">メールを確認してください</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {email} にログイン用リンクを送りました。リンクを開くと、このアプリに戻ります。
              </p>
              <Button variant="ghost" className="mt-5" onClick={() => setSent(false)}>別のアドレスを使う</Button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Mail size={23} />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-1">
                {isSignUp ? "アカウントを作成" : "おかえりなさい"}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">メールで届くリンクから安全にログインします</p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">メールアドレス</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "送信中..." : "ログインリンクを送る"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-5 text-center">社内メールアドレスでの登録を推奨しています</p>
              <div className="text-sm text-center mt-5">
                {isSignUp ? (
                  <Link href="/sign-in" className="text-primary">登録済みの方はこちら</Link>
                ) : (
                  <Link href="/sign-up" className="text-primary">はじめて利用する方はこちら</Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
