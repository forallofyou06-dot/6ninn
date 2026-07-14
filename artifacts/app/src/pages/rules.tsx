import { MobileLayout } from "@/components/layout/MobileLayout";
import { Link } from "wouter";
import { ChevronLeft, Shield, Clock, Coins, Users, Heart, AlertTriangle } from "lucide-react";

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon size={15} className="text-primary" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-10">{children}</div>
    </div>
  );
}

export default function Rules() {
  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href="/my" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> マイページ
        </Link>
        <h1 className="text-xl font-serif font-bold mb-1">ルール・ガイドライン</h1>
        <p className="text-sm text-muted-foreground mb-6">偶然の6人をみんなで楽しくつかうために</p>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-primary font-medium mb-2">🎯 コンセプト</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            偶然の6人は、社内でお互いをもっとよく知るための少人数交流会を気軽に開催できるツールです。
            日頃は話したことのない人と、共通の趣味や話題を通じてつながるきっかけを作ります。
          </p>
        </div>

        <Section icon={Users} title="参加人数">
          <p>1回の交流会は最大<strong>6人</strong>まで。少人数だからこそ、一人ひとりとしっかり話せます。</p>
          <p>最低催行人数は、主催者を含めて<strong>3人</strong>です。締切時点で3人未満の場合は自動で未実施となります。</p>
        </Section>

        <Section icon={Clock} title="開催時間">
          <p>1回あたり最大<strong>2時間</strong>以内。手軽に参加できるランチや夕方の会を想定しています。</p>
          <p>時間を大切に、終了時刻は守るようにしましょう。</p>
        </Section>

        <Section icon={Coins} title="参加費">
          <p>参加費は1人あたり最大<strong>5,000円</strong>。費用は原則として実費の割り勘です。</p>
          <p>会費は事前にアプリで確認し、当日忘れずに準備してください。</p>
        </Section>

        <Section icon={Heart} title="コミュニティガイドライン">
          <p>・すべての参加者が安心して楽しめる場を作りましょう</p>
          <p>・初対面でも話しやすい雰囲気を心がけましょう</p>
          <p>・特定の話題（政治・宗教・差別など）への言及は控えましょう</p>
          <p>・写真・SNS投稿は参加者全員の合意を得てから</p>
          <p>・キャンセルはできる限り早めに（締切前のキャンセルはアプリから可能）</p>
        </Section>

        <Section icon={Shield} title="ホスト向けガイドライン">
          <p>・テーマや場所を明確に記載しましょう</p>
          <p>・当日は参加者に気を配り、場を盛り上げましょう</p>
          <p>・開催後は「開催レポート」を投稿して記録を残しましょう</p>
          <p>・やむを得ずキャンセルが必要な場合は早めに参加者に連絡してください</p>
        </Section>

        <Section icon={AlertTriangle} title="禁止事項">
          <p>・ハラスメント・差別的言動</p>
          <p>・勧誘・営業活動</p>
          <p>・参加費の不正徴収</p>
          <p>・個人情報の無断収集・拡散</p>
          <p>・社内規定に反する行為</p>
        </Section>

        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground">
          <p>ガイドラインに違反する行為があった場合、事務局が対応します。問題が発生した際はフィードバックからご連絡ください。</p>
        </div>
      </div>
    </MobileLayout>
  );
}
