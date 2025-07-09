# Mastra Realtime Voice API Demo

> 📚 **Read in other languages:** [日本語 (Japanese)](README.ja.md)

A demo project for real-time voice communication applications using the Mastra framework. Utilizing OpenAI's Realtime Voice API to create presentations through natural voice conversations. (The goal)

## 📋 Prerequisites

- Node.js 20.9.0 or higher
- pnpm package manager
- OpenAI API key

## 🔧 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd mastra-realtime-voice-api-demo
```

2. Install dependencies:

```bash
# Frontend
cd frontend
pnpm install

# Backend
cd ../mastra-voice-app
pnpm install
```

3. Set up environment variables:

Configure your OpenAI API key in the `.env` file.

```bash
# Create .env file in mastra-voice-app directory
OPENAI_API_KEY=sk-proj-xxxx
```

## 🚀 Usage

### Development Mode

1. Start the backend server:

```bash
cd mastra-voice-app
pnpm run dev
```

2. Start the frontend:

```bash
cd frontend
pnpm run dev
```

3. Access in your browser

### Production Build

```bash
# Backend
cd mastra-voice-app
pnpm build

# Frontend
cd frontend
pnpm build
```

## 📁 Project Structure

```
mastra-realtime-voice-api-demo/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── App.tsx          # Main application
│   │   ├── i18n/            # Internationalization settings
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── mastra-voice-app/        # Mastra backend
│   ├── src/
│   │   └── mastra/          # Mastra configuration and features
│   ├── package.json
│   └── .mastra/
└── README.md
```

### Mastra Configuration

Mastra configuration is managed in the `mastra-voice-app/src/mastra/` directory.

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you have any issues or questions, please report them on the GitHub Issues page.

## 🔗 Related Links

- [Mastra Official Website](https://mastra.ai)
- [OpenAI Realtime API](https://openai.com/blog/introducing-the-realtime-api)
