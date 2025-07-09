console.log("mastra kidou");
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { outputDir } from "./const";

export const mastra = new Mastra({
    agents: {},
    storage: new LibSQLStore({
        url: ":memory:",
    }),
    logger: new PinoLogger({
        name: "Mastra",
        level: "info",
    }),
});

console.log("WebSocketサーバー起動");

import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { OpenAIRealtimeVoice } from "@mastra/voice-openai-realtime";
import { WebSocketServer, WebSocket } from "ws";
import { Int16QueueStream } from "./utils/Int16QueueStream";
import {
    RealtimeVoiceAgentCommunicationData,
    RealtimeVoiceAgentCommunicationDataAgentWriting,
    RealtimeVoiceAgentCommunicationDataTypes,
    RealtimeVoiceAgentCommunicationDataAgentResponseCreated,
    RealtimeVoiceAgentCommunicationDataAgentSpeaker,
    RealtimeVoiceAgentCommunicationDataAgentSpeakingDone,
    RealtimeVoiceAgentCommunicationDataAgentResponseDone,
    RealtimeVoiceAgentCommunicationDataAgentToolCallStart,
    RealtimeVoiceAgentCommunicationDataAgentToolCallResult,
  } from "./types";

import { mcp } from "./mcp";
import { instruction_simple } from "./const";

// ws型拡張
type AgentWebSocket = WebSocket & { agent?: Agent };

// WebSocketサーバーを作成
const wss = new WebSocketServer({ port: 8080 });
wss.on("connection", async (wsBase) => {
    const ws = wsBase as AgentWebSocket;
    console.log("WebSocketクライアント接続");

    const voice = new OpenAIRealtimeVoice({
        model: "gpt-4o-mini-realtime-preview",
        // model: "gpt-4o-realtime-preview-2025-06-03",
        // model: "gpt-4o-realtime-preview",
        // model: "gpt-4o-realtime-preview-2025-06-03",
        speaker: "alloy",
    });
    voice.updateConfig({
        turn_detection: {
            type: "server_vad",
            threshold: 0.6,
            silence_duration_ms: 1200,
        },
    });
    const int16Stream = new Int16QueueStream();
    const agent = new Agent({
        name: "Agent",
        instructions: instruction_simple,
        model: openai("gpt-4o"),
        tools: { ...(await mcp.getTools()) },
        voice,
    });
    ws.agent = agent;
    await voice.connect();
    voice.send(int16Stream);

    // イベント送信関数（各接続用）
    const emitCommunicationData = (data: RealtimeVoiceAgentCommunicationData) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(data));
        }
    };
    const emitAudio = (audio: Int16Array) => {
        if (ws.readyState === 1) {
            ws.send(audio, { binary: true });
        }
    };

    voice.on("error", (error) => {
        console.error("Voice error:", error);
    });
    voice.on("tool-call-start", (data) => {
        console.log("tool-call-start", data);
        const d = data as unknown as { toolCallId: string; toolName: string; toolDescription: string; args:any };
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentToolCallStart = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentToolCallStart,
            toolCallId: d.toolCallId,
            toolName: d.toolName,
            toolDescription: d.toolDescription,
            args: d.args,
        };
        emitCommunicationData(communicationData);
    });
    voice.on("tool-call-result", (data) => {
        console.log("tool-call-result", data);
        const d = data as unknown as { toolCallId: string; toolName: string; result: string };
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentToolCallResult = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentToolCallResult,
            toolCallId: d.toolCallId,
            toolName: d.toolName,
            result: d.result,
        };
        emitCommunicationData(communicationData);
    });
    voice.on("response.created", (data) => {
        const d = data as unknown as { response: { id: string; conversation_id: string } };
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentResponseCreated = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentResponseCreated,
            conversationId: d.response.conversation_id,
            responseId: d.response.id,
        };
        emitCommunicationData(communicationData);
    });
    voice.on("speaker", (data) => {
        const d = data as unknown as { id: string };
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentSpeaker = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentSpeaker,
            responseId: d.id,
        };
        emitCommunicationData(communicationData);
    });
    voice.on("writing", ({ text, role }) => {
        const data: RealtimeVoiceAgentCommunicationDataAgentWriting = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentWriting,
            text,
            role,
        };
        emitCommunicationData(data);
    });
    voice.on("speaking", ({ audio }) => {
        emitAudio(audio as Int16Array);
    });
    voice.on("speaking.done", (data) => {
        console.log("speaking.done", data);
        const d = data as unknown as { response_id: string };
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentSpeakingDone = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentSpeakingDone,
            responseId: d.response_id,
        };
        emitCommunicationData(communicationData);
    });
    voice.on("response.done", (data) => {
        console.log("response.done", data);
        const d = data as unknown as {
            response: { conversation_id: string; id: string; status?: string; status_details?: { type?: string; reason?: string } };
        };
        console.log("response.done", d.response?.status || "");
        console.log("response.done", d.response?.status_details?.reason || "");
        const communicationData: RealtimeVoiceAgentCommunicationDataAgentResponseDone = {
            type: RealtimeVoiceAgentCommunicationDataTypes.agentResponseDone,
            conversationId: d.response.conversation_id,
            responseId: d.response.id,
            status: d.response.status || "",
            status_details_type: d.response.status_details?.type || "",
            status_details_reason: d.response.status_details?.reason || "",
        };
        emitCommunicationData(communicationData);
    });

    voice.speak("Hello, I'm your AI assistant!");

    // 音声データ受信
    ws.on("message", (data, isBinary) => {
        if (isBinary) {
            try {
                const buf = data as Buffer;
                const int16 = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
                int16Stream.pushInt16(int16);
            } catch (error) {
                console.error("error", error);
            }
        } else {
            console.log("text message:", data.toString());
        }
    });

    ws.on("close", () => {
        console.log("WebSocketクライアント切断");
        if (ws.agent && ws.agent.voice) {
            ws.agent.voice.close();
        }
    });
});

console.log("realtime voice start");


