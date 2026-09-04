# 日本人はどう暮らしてきたか

総務省「国勢調査」と国立社会保障・人口問題研究所「日本の世帯数の将来推計」をもとに、
一般世帯の家族類型を時代・世帯主・地域の3つの切り口で探索するダッシュボード。

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

## 開発

```bash
cp .env.example .env   # ESTAT_APP_ID を設定
npm install
npm run meta           # e-Stat メタ取得
npm run fetch          # 国勢調査データ取得
# 社人研 xlsx は data/raw/ipss/ に配置（取得手順は docs/data-sources.md）
npm run data           # public/data/*.json を生成
npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run meta` | e-Stat メタ情報 |
| `npm run fetch` | e-Stat 生データ取得 |
| `npm run data` | 配信用 cube 構築（国勢＋社人研） |
| `npm run verify` | 健全性チェック |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。
