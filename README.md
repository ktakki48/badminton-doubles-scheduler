# ダブルス対戦メーカー

バドミントンダブルス用の対戦表メーカーです。Safariで開いてiPhoneのホーム画面に追加すると、アプリ風に利用できます。

## 主な機能

- 登録メンバー最大50人の端末内保存
- 開催ごとの当日参加者選択
- 使用コート数・試合数の設定
- レーティングあり／なしの組み分け
- 直近ペア・対戦相手の重複を抑えた対戦表作成
- テキストコピー、テキスト表示、画像出力
- 登録メンバー名簿のJSON出力／読込
- iPhone幅では作成済み対戦表を横スクロールで確認
- PWA対応：ホーム画面追加、オフラインキャッシュ

## V22.1の変更点

- メンバーマスターの登録上限を30人から50人へ拡張
- 登録メンバー名簿をJSONファイルとして出力するボタンを追加
- JSONファイルから名簿を読み込み、機種変更後や別端末で復元できるボタンを追加
- V22のiPhone横スクロール表示、画像出力、GitHub公開用構成は維持

## ファイル構成

```text
.
├── index.html          # アプリ本体
├── manifest.json       # PWA設定
├── sw.js               # Service Worker / キャッシュ設定
├── icons/              # ホーム画面・PWA用アイコン
├── README.md           # この説明書
├── CHANGELOG.md        # 変更履歴
├── LICENSE             # 権利表記
├── .gitignore          # Git管理から除外するファイル
└── .nojekyll           # GitHub Pagesで静的ファイルをそのまま配信するための空ファイル
```

## GitHub Pagesへの配置方法

1. このZipを解凍します。
2. `index.html`、`manifest.json`、`sw.js`、`icons`フォルダ、README等をリポジトリ直下へアップロードします。
3. GitHubの `Settings` → `Pages` で、公開元を `main` ブランチの `/root` に設定します。
4. Pagesの公開URLにアクセスし、Safariで「共有」→「ホーム画面に追加」を選びます。

> 注意：`index.html` がリポジトリ直下にある構成を前提にしています。`doubles-match-maker-v22-1` のようなフォルダごとアップロードする場合は、GitHub Pagesの公開パスが一段深くなります。

## 更新時の注意

Service Workerでキャッシュしているため、更新時は `sw.js` の `CACHE_NAME` を新しいバージョン名へ変更してください。V22.1では `doubles-match-maker-v22-1` に設定済みです。

既存ユーザーの端末内データは、V22までの保存キーから読み込めるようにしています。

## 動作環境

- iPhone Safari
- PCブラウザ（Chrome / Edge / Safari相当）
- 静的ホスティング（GitHub Pages等）

サーバー側のプログラムやビルド環境は不要です。
