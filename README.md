# 旅行用割り勘アプリ

旅行の参加者と支払いを登録し、「誰が誰にいくら送ればよいか」を日本円または旅行先の通貨で計算するNext.jsアプリです。データは同じブラウザーの`localStorage`に保存します。

## 主な機能

- 複数の旅行を作成・保存・削除
- 参加者の追加と、支払いに関係する参加者の安全な削除制限
- 支払った人、金額、内容、費用を負担する人の登録・編集
- 一部の参加者だけが負担する立て替えに対応
- 端数を含む最終負担額と送金案の自動計算
- 旅行ごとの現地通貨と、日本円・現地通貨の支払いに対応
- Frankfurterからの為替レート取得と手入力によるフォールバック
- 日本円／現地通貨の切替時に換算・丸め・送金額を再計算
- 精算結果のコピーと、メンバー別内訳の折り畳み表示
- 旅行設定の編集モードで旅行名・現地通貨・メンバー・レートを変更
- 現地通貨を途中変更しても、過去の支払いを元通貨のまま保持して精算時に換算
- 旧バージョンの保存データを自動移行

## ローカル開発

必要環境はNode.js 24とnpmです。

```bash
npm ci
npm run dev
```

起動後に[http://localhost:3000](http://localhost:3000)を開きます。

## Dockerで起動

Docker Desktopを起動した状態で、プロジェクト直下で次を実行します。

```bash
docker compose up --build
```

ビルド後に[http://localhost:3000](http://localhost:3000)を開きます。停止するときはターミナルで`Ctrl + C`を押します。作成されたコンテナーを削除する場合は次を実行します。

```bash
docker compose down
```

Docker構成はNext.jsの`standalone`出力を使うマルチステージビルドです。実行用イメージに必要なファイルだけを入れ、rootではなくNode.js公式イメージの`node`ユーザーで実行します。

## 品質確認

```bash
npm test
npm run lint
npm run build
```

## 使用技術

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS 4
- Docker
