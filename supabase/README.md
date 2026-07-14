# Supabase database

`migrations/`内のSQLをファイル名順に適用した状態が、本番データベースのソース・オブ・トゥルースです。

含まれるもの:

- Authユーザーと`profiles`の自動同期
- イベント、タグ、申込、レポート、いいね、通知、フィードバック
- 全テーブルのRLS
- 公開用キーから安全に呼び出せるRPC
- `SELECT FOR UPDATE`を使った先着申込の定員超過防止
- ホスト・参加者・事務局の権限検証
- 締切と開催日時から導出するイベント状態
- 主催者を含む最低催行人数3人のDB制約
- 締切3日前からの一覧優先表示
- 苗字・名前の両方がある氏名形式の検証
- マイページおよび事務局KPI

SQLの適用後、Supabase AuthのSite URLとRedirect URLをGitHub PagesのURLに設定してください。

公開用の`publishable key`はフロントエンド用です。RLSを無視する`service_role`またはSecret keyは絶対にGitHubへ登録しないでください。
