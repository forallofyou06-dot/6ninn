import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Landing() {
  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 text-primary">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        
        <h1 className="font-serif text-3xl font-bold mb-4 tracking-tight text-foreground">
          偶然の6人
        </h1>
        <p className="text-muted-foreground mb-12 text-sm leading-relaxed max-w-xs">
          少人数で、ゆるく集まる。<br/>
          最大6人、2時間以内、5000円以内。<br/>
          ちょっとしたつながりを生む場所。
        </p>

        <div className="flex flex-col gap-4 w-full">
          <Button asChild className="w-full h-14 text-base rounded-xl font-medium shadow-sm">
            <Link href="/sign-up">はじめる</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
            <Link href="/sign-in">ログイン</Link>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
