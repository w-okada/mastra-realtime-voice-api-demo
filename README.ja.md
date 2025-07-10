# Mastra リアルタイム音声 API デモ

Mastra フレームワークを使用したリアルタイム音声通信アプリケーションのデモプロジェクトです。OpenAI のリアルタイム音声 API を活用して、自然な音声対話をしながらプレゼンテーションを作成できます。（という目標）

https://youtu.be/WcDe1c1QiRE

## 📋 前提条件

- Node.js 20.9.0 以上
- pnpm パッケージマネージャー
- OpenAI API キー

## 🔧 インストール

1. リポジトリをクローンします：

```bash
git clone <repository-url>
cd mastra-realtime-voice-api-demo
```

2. 依存関係をインストールします：

```bash
# フロントエンド
cd frontend
pnpm install

# バックエンド
cd ../mastra-voice-app
pnpm install
```

3. 環境変数を設定します：

`.env` ファイルで OpenAI API キーを設定してください。

```bash
# mastra-voice-app ディレクトリに .env ファイルを作成
OPENAI_API_KEY=sk-proj-xxxx
```

## 🚀 使用方法

### 開発モードで起動

1. バックエンドサーバーを起動：

```bash
cd mastra-voice-app
pnpm run dev
```

2. フロントエンドを起動：

```bash
cd frontend
pnpm run dev
```

1. ブラウザでアクセス

### 本番ビルド

```bash
# バックエンド
cd mastra-voice-app
pnpm build

# フロントエンド
cd frontend
pnpm build
```

## 📁 プロジェクト構造

```
mastra-realtime-voice-api-demo/
├── frontend/                 # React フロントエンド
│   ├── src/
│   │   ├── App.tsx          # メインアプリケーション
│   │   ├── i18n/            # 国際化設定
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── mastra-voice-app/        # Mastra バックエンド
│   ├── src/
│   │   └── mastra/          # Mastra設定と機能
│   ├── package.json
│   └── .mastra/
└── README.md
```

### Mastra 設定

Mastra の設定は `mastra-voice-app/src/mastra/` ディレクトリで管理されています。

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています。

## ⚠️ 免責事項

このプロジェクトはデモンストレーション目的で作成されており、本番環境での使用は推奨されません。使用する際は以下の点にご注意ください：

- **API 利用料金**: このアプリケーションは OpenAI の Realtime API を使用しています。API の利用には料金が発生します。詳細は [OpenAI の料金体系](https://openai.com/pricing) をご確認ください。
- **データ処理**: 音声データは OpenAI のサーバーに送信されます。機密情報や個人情報を含む会話は避けてください。
- **サポート**: このデモプロジェクトは学習・実験目的で提供されており、継続的なサポートは保証されません。

使用者は自己責任において本プロジェクトを利用し、発生する費用や問題について開発者は一切の責任を負いません。

## 🆘 サポート

問題や質問がある場合は、GitHub の Issues ページで報告してください。

## 🔗 関連リンク

- [Mastra 公式サイト](https://mastra.ai)
- [OpenAI Realtime API](https://openai.com/blog/introducing-the-realtime-api)
