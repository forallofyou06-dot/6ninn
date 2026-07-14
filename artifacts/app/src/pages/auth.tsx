import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const EMAIL_COOLDOWN_MS = 60_000;
const EMAIL_SENT_AT_KEY = "guuzen-no-6nin-auth-email-sent-at";

type AuthErrorDetails = {
  code?: string;
  message?: string;
  status?: number;
};

function isEmailRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message, status } = error as AuthErrorDetails;
  const details = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  return (
    status === 429 ||
    details.includes("rate limit") ||
    details.includes("rate_limit")
  );
}

function getStoredSentAt() {
  try {
    return Number(window.localStorage.getItem(EMAIL_SENT_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function storeSentAt() {
  try {
    window.localStorage.setItem(EMAIL_SENT_AT_KEY, String(Date.now()));
  } catch {
    // The server still enforces its own rate limit when storage is unavailable.
  }
}

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const { toast } = useToast();
  const isSignUp = mode === "sign-up";

  useEffect(() => {
    setSent(false);
  }, [mode]);

  useEffect(() => {
    const updateRetryAfter = () => {
      const remaining = EMAIL_COOLDOWN_MS - (Date.now() - getStoredSentAt());
      setRetryAfter(Math.max(0, Math.ceil(remaining / 1000)));
    };

    updateRetryAfter();
    const timer = window.setInterval(updateRetryAfter, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password || (isSignUp && retryAfter > 0)) return;
    if (isSignUp && password !== passwordConfirmation) {
      toast({
        title: "確認用パスワードが一致しません",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const redirectTo = new URL(
          import.meta.env.BASE_URL,
          window.location.origin,
        ).toString();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        if (data.session) {
          setLocation("/onboarding");
          return;
        }

        storeSentAt();
        setRetryAfter(Math.ceil(EMAIL_COOLDOWN_MS / 1000));
        setSent(true);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setLocation("/events");
    } catch (error) {
      if (isSignUp && isEmailRateLimitError(error)) {
        storeSentAt();
        setRetryAfter(Math.ceil(EMAIL_COOLDOWN_MS / 1000));
        toast({
          title: "認証メールの送信上限に達しました",
          description:
            "現在はメールを送れません。最大1時間ほど空けてから、もう一度お試しください。",
          variant: "destructive",
        });
        return;
      }

      const details = error as AuthErrorDetails;
      if (details.code === "invalid_credentials") {
        toast({
          title: "メールアドレスまたはパスワードが違います",
          variant: "destructive",
        });
        return;
      }
      if (details.code === "email_not_confirmed") {
        toast({
          title: "メールアドレスの確認が完了していません",
          description:
            "新規登録時に届いた確認メールを開いてからログインしてください。",
          variant: "destructive",
        });
        return;
      }
      if (details.code === "weak_password") {
        toast({
          title: "パスワードの安全性が不足しています",
          description:
            "8文字以上の、推測されにくいパスワードを設定してください。",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isSignUp
          ? "アカウントを作成できませんでした"
          : "ログインできませんでした",
        description:
          error instanceof Error
            ? error.message
            : "時間をおいて、もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-[100dvh] flex flex-col justify-center p-6">
        <Link
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft size={15} /> 戻る
        </Link>
        <div className="w-full max-w-sm mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-5">
              <CheckCircle size={46} className="mx-auto mb-4 text-green-600" />
              <h1 className="font-serif text-xl font-bold mb-2">
                メールを確認してください
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {email}{" "}
                に登録確認メールを送りました。一度だけメール内のリンクを開いて、登録を完了してください。
              </p>
              <Button
                variant="ghost"
                className="mt-5"
                onClick={() => setSent(false)}
              >
                別のアドレスを使う
              </Button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Mail size={23} />
              </div>
              <h1 className="font-serif text-2xl font-bold mb-1">
                {isSignUp ? "アカウントを作成" : "おかえりなさい"}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {isSignUp
                  ? "メールアドレスとパスワードを登録します"
                  : "メールアドレスとパスワードでログインします"}
              </p>
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
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">パスワード</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    placeholder={isSignUp ? "8文字以上" : "パスワード"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-password-confirmation">
                      パスワード（確認）
                    </Label>
                    <Input
                      id="auth-password-confirmation"
                      type="password"
                      autoComplete="new-password"
                      placeholder="もう一度入力"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      minLength={8}
                      required
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || (isSignUp && retryAfter > 0)}
                >
                  {loading
                    ? isSignUp
                      ? "登録中..."
                      : "ログイン中..."
                    : isSignUp && retryAfter > 0
                      ? `再登録まで ${retryAfter}秒`
                      : isSignUp
                        ? "アカウントを作成"
                        : "ログイン"}
                </Button>
                {isSignUp && retryAfter > 0 && (
                  <p
                    className="text-xs text-muted-foreground text-center"
                    aria-live="polite"
                  >
                    認証メールの連続送信を防ぐため、少しお待ちください
                  </p>
                )}
              </form>
              <p className="text-xs text-muted-foreground mt-5 text-center">
                社内メールアドレスでの登録を推奨しています
              </p>
              <div className="text-sm text-center mt-5">
                {isSignUp ? (
                  <Link href="/sign-in" className="text-primary">
                    登録済みの方はこちら
                  </Link>
                ) : (
                  <Link href="/sign-up" className="text-primary">
                    はじめて利用する方はこちら
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
