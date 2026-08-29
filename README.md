# 住宅購入タイミング シミュレーター

「今住宅を購入する場合」と「一定期間待ち、頭金を増やしてから購入する場合」のローン返済額を比較する、日本語のブラウザ完結型シミュレーターです。結果と差額だけを中立的に表示し、購入時期の推奨や評価は行いません。入力データは外部送信せず、ブラウザの `localStorage` にのみ保存します。

## ローカル起動

Node.js 22 以降を推奨します。

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## 検証とビルド

```bash
npm run lint
npm test
npm run build
```

静的ファイルは `out/` に出力されます。

## GitHub Pages への公開

1. このプロジェクトを GitHub リポジトリの `main` ブランチへ push します。
2. GitHub の **Settings > Pages > Build and deployment > Source** で **GitHub Actions** を選択します。
3. 同梱の `.github/workflows/deploy.yml` が lint・test・build 後に `out/` を公開します。

Actions 実行時は `GITHUB_REPOSITORY` からリポジトリ名を取得し、project site では `basePath` と `assetPrefix` を自動設定します。`username.github.io` リポジトリではルートパスを使用します。

## 計算ロジック

- 元利均等返済、月払い、ボーナス返済なし、返済中の金利一定
- 月利 `r = 年利 / 100 / 12`、回数 `n = 返済年数 × 12`
- 月返済額 `P × r(1+r)^n / ((1+r)^n - 1)`
- 金利 0% のときは `P / n`
- 必要頭金は、目標月返済額または目標総返済額から借入可能元本を逆算
- 金利の分岐点は、0〜20%の範囲を二分探索して算出
- 内部では JavaScript の倍精度浮動小数点で計算し、表示時のみ円または万円単位に四捨五入

「総返済額」はローン元利合計です。購入諸費用、待機中住居費などは別項目として表示します。将来の追加頭金は、待機中住居費を支払った後に純粋に増える住宅購入用現金として扱います。

## 使用技術

- Next.js（App Router / static export）
- React / TypeScript
- Vitest
- ESLint
- GitHub Actions / GitHub Pages

## ディレクトリ構成

```text
app/                    UI、レイアウト、スタイル
lib/mortgage.ts         住宅ローンと逆算の純粋関数
lib/mortgage.test.ts    主要計算の単体テスト
.github/workflows/      GitHub Pages デプロイ設定
next.config.ts          static export / project site 設定
```
