import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    type RealtimeVoiceAgentCommunicationData,
    type RealtimeVoiceAgentCommunicationDataAgentResponseCreated,
    type RealtimeVoiceAgentCommunicationDataAgentResponseDone,
    type RealtimeVoiceAgentCommunicationDataAgentSpeaker,
    type RealtimeVoiceAgentCommunicationDataAgentToolCallResult,
    type RealtimeVoiceAgentCommunicationDataAgentToolCallStart,
    type RealtimeVoiceAgentCommunicationDataAgentWriting,
} from "../../mastra-voice-app/src/mastra/types";
import { AudioRecorder, type VADWorkerVadResponse } from "@dannadori/audio-recorder-js";
import "./App.css";

type ResponseType = "voice" | "toolCall";

type Response = {
    type: ResponseType;
};

type VoiceResponse = Response & {
    type: "voice";
    responseId: string;
    voiceBuffer: Float32Array;
    text: string;
    status: "speaking" | "completed" | "cancelled" | "failed" | "error" | "incomplete";
    statusDetailsType: string;
    statusDetailsReason: string;

    playingStatus: "ready" | "playing" | "done" | "skipped";
    playingStartTime: number;
    playingDuration: number;
    playingSendOffset: number;
};

type ToolCallResponse = Response & {
    type: "toolCall";
    callId: string;
    name: string;
    description: string;
    args: unknown;
    result: unknown;
    status: "processing" | "done" | "error";
};

function App() {
    const { t, i18n } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const [recorder, setRecorder] = useState<AudioRecorder | null>(null);

    const greetingDetectedRef = useRef<boolean>(false);

    const latestResponseIdRef = useRef<string | null>(null);
    const responseIdQueueRef = useRef<string[]>([]);
    const responses = useRef<{ [key: string]: VoiceResponse | ToolCallResponse }>({});
    const [playingResponse, setPlayingResponse] = useState<VoiceResponse | null>(null);
    const [processingToolCalls, setProcessingToolCalls] = useState<ToolCallResponse[]>([]);

    const vadStatusRef = useRef<"active" | "inactive">("inactive");
    const [vadStatus, setVadStatus] = useState<"active" | "inactive">("inactive");

    const updateConversationStatus = () => {
        // 再生中のVoiceレスポンスを取得 (play完了, skip以外)
        const currentPlayingResponse =
            Object.values(responses.current).find((v) => {
                if (v.type == "voice") {
                    const voiceResponse = v as VoiceResponse;
                    return voiceResponse.playingStatus != "done" && voiceResponse.playingStatus != "skipped";
                } else {
                    return false;
                }
            }) || null;

        if (currentPlayingResponse == null) {
            if (Object.values(responses.current).length == 0) {
                setPlayingResponse(null);
            }
            return;
        }

        if (currentPlayingResponse.type != "voice") {
            console.error("currentPlayingResponse is not voice", currentPlayingResponse);
            return;
        }

        // Readyのものを初期化
        if (currentPlayingResponse.playingStatus == "ready") {
            currentPlayingResponse.playingDuration = 0;
            currentPlayingResponse.playingSendOffset = 0;
            currentPlayingResponse.playingStatus = "playing";
        }

        // n秒分のバッファがたまるか、発話が終わるまで待機
        const bufferLength = currentPlayingResponse.voiceBuffer.length;
        const speechDone = currentPlayingResponse.status == "completed" || currentPlayingResponse.status == "cancelled";
        if (bufferLength < 24000 * 0.3 && !speechDone) {
            return;
        }

        // 再生開始時間の設定
        if (currentPlayingResponse.playingStartTime == 0) {
            currentPlayingResponse.playingStartTime = Date.now();
        }
        // 送信していないバッファがあれば送信
        const sendOffset = currentPlayingResponse.playingSendOffset;
        const voiceBuffer = currentPlayingResponse.voiceBuffer;
        const sendLength = voiceBuffer.length - sendOffset;
        if (sendLength > 0) {
            const sendBuffer = voiceBuffer.subarray(sendOffset, sendOffset + sendLength);
            recorder?.sendOutputVoice(sendBuffer);
        }
        currentPlayingResponse.playingSendOffset += sendLength;

        // Durationのアップデート（現在取得完了部分のみで算出）
        currentPlayingResponse.playingDuration = voiceBuffer.length / 24000;

        // 再生済み時間と表示テキストのアップデート
        const nowTime = Date.now();
        const playTime = (nowTime - currentPlayingResponse.playingStartTime) / 1000;

        // 再生時間がdurationを超えたらこのレスポンスの再生は終了。
        if (playTime > currentPlayingResponse.playingDuration && currentPlayingResponse.status == "completed") {
            currentPlayingResponse.playingStatus = "done";
        }
        // 表示用コピーの生成
        setPlayingResponse({ ...currentPlayingResponse });
    };

    useEffect(() => {
        if (recorder == null) {
            return;
        }
        const interval = setInterval(() => {
            updateConversationStatus();
        }, 200);
        return () => clearInterval(interval);
    }, [recorder]);

    const startRecording = async () => {
        setIsRecording(true);

        // Recorderの初期化
        let currentRecorder = recorder;
        if (currentRecorder == null) {
            const ctx = new AudioContext({ sampleRate: 24000 });
            currentRecorder = new AudioRecorder(ctx, false);
            await currentRecorder.isInitialized();
            const clientSetting = await currentRecorder.getClientSetting();
            clientSetting.audioRecorderSetting.audioInput = "default";
            console.log("audio recording settings:", clientSetting.audioRecorderSetting);
            await currentRecorder.updateSettings(clientSetting);
            setRecorder(currentRecorder);

            const audio = document.getElementById("audio") as HTMLAudioElement;
            audio.volume = 1;
            audio.srcObject = currentRecorder.stream;
            audio.play();
        }

        // WebSocketの接続
        if (wsRef.current != null) {
            wsRef.current.close();
            wsRef.current = null;
        }
        wsRef.current = new window.WebSocket("ws://localhost:8080");
        wsRef.current.binaryType = "arraybuffer";

        wsRef.current.onmessage = (event) => {
            // console.log(event);
            const data = event.data;
            if (typeof data === "string") {
                const communicationData = JSON.parse(data) as RealtimeVoiceAgentCommunicationData;
                // console.log(communicationData);
                if (communicationData.type === "agentResponseCreated") {
                    const agentResponseCreated = communicationData as RealtimeVoiceAgentCommunicationDataAgentResponseCreated;
                    console.log("agentResponseCreated", agentResponseCreated.responseId, agentResponseCreated.conversationId);
                    if (latestResponseIdRef.current == null || latestResponseIdRef.current !== agentResponseCreated.responseId) {
                        console.log("--- new response ---", agentResponseCreated.responseId);
                        latestResponseIdRef.current = agentResponseCreated.responseId;
                        responseIdQueueRef.current.push(agentResponseCreated.responseId);
                        // 新規レスポンス用のバッファ作成
                        responses.current[agentResponseCreated.responseId] = {
                            type: "voice",
                            responseId: agentResponseCreated.responseId,
                            voiceBuffer: new Float32Array(0),
                            text: "",
                            status: "speaking",
                            statusDetailsType: "",
                            statusDetailsReason: "",
                            playingStatus: "ready",
                            playingStartTime: 0,
                            playingDuration: 0,
                            playingSendOffset: 0,
                        };
                    }
                } else if (communicationData.type === "agentSpeaker") {
                    const agentSpeaker = communicationData as RealtimeVoiceAgentCommunicationDataAgentSpeaker;
                    console.log("agentSpeaker", agentSpeaker.responseId);
                } else if (communicationData.type === "agentWriting") {
                    const agentWriting = communicationData as RealtimeVoiceAgentCommunicationDataAgentWriting;
                    if (agentWriting.role === "assistant") {
                        if (latestResponseIdRef.current != null && responses.current[latestResponseIdRef.current] != undefined) {
                            const responseText = (responses.current[latestResponseIdRef.current] as VoiceResponse).text;
                            (responses.current[latestResponseIdRef.current] as VoiceResponse).text = responseText + agentWriting.text;
                        }
                    } else if (agentWriting.role === "user") {
                        // currentResponseUserTextRef.current += agentWriting.text;
                        // statusがdoneのもので未処理のレスポンスをスキップする。
                        // const doneResponses = Object.values(voiceResponses.current).filter((v) => v.status == "done");
                        // doneResponses.forEach((v) => {
                        //     if(v.playingStatus == "playing"){
                        //         v.playingStatus = "done";
                        //         console.log("skip", v.responseId, v.text);
                        //     }
                        // });
                        // currentRecorder?.truncateOutputBuffer()
                    }
                } else if (communicationData.type === "agentSpeakingDone") {
                    // const agentSpeakingDone = communicationData as RealtimeVoiceAgentCommunicationDataAgentSpeakingDone;
                } else if (communicationData.type === "agentResponseDone") {
                    if (greetingDetectedRef.current == false) {
                        greetingDetectedRef.current = true;
                    }
                    const agentResponseDone = communicationData as RealtimeVoiceAgentCommunicationDataAgentResponseDone;
                    console.log("agentResponseDone", agentResponseDone.responseId, agentResponseDone.conversationId);
                    if (agentResponseDone.responseId != latestResponseIdRef.current) {
                        console.error("responseId mismatch", agentResponseDone.responseId, latestResponseIdRef.current);
                    }
                    const voiceResponse = responses.current[agentResponseDone.responseId] as VoiceResponse;
                    voiceResponse.statusDetailsType = agentResponseDone.status_details_type;
                    voiceResponse.statusDetailsReason = agentResponseDone.status_details_reason;
                    if (agentResponseDone.status == "completed") {
                        voiceResponse.status = "completed";
                        console.error("agentResponseDone:Completed:::", agentResponseDone);
                    } else if (agentResponseDone.status == "cancelled") {
                        voiceResponse.status = "cancelled";
                        console.error("agentResponseDone:Cancelled:::", agentResponseDone);
                    } else if (agentResponseDone.status == "failed") {
                        voiceResponse.status = "failed";
                        console.error("agentResponseDone:Failed:::", agentResponseDone);
                    } else if (agentResponseDone.status == "incomplete") {
                        voiceResponse.status = "incomplete";
                        console.error("agentResponseDone:incomplete:::", agentResponseDone);
                    } else {
                        voiceResponse.status = "error";
                        console.error("agentResponseDone:Unknown:::", agentResponseDone);
                    }
                } else if (communicationData.type === "agentToolCallStart") {
                    const agentToolCallStart = communicationData as RealtimeVoiceAgentCommunicationDataAgentToolCallStart;
                    responses.current[agentToolCallStart.toolCallId] = {
                        type: "toolCall",
                        callId: agentToolCallStart.toolCallId,
                        name: agentToolCallStart.toolName,
                        description: agentToolCallStart.toolDescription,
                        args: agentToolCallStart.args,
                        result: null,
                        status: "processing",
                    };

                    const processing = Object.values(responses.current).filter((r) => {
                        if (r.type == "toolCall") {
                            const toolCallResponse = r as ToolCallResponse;
                            return toolCallResponse.status == "processing";
                        } else {
                            return false;
                        }
                    }) as ToolCallResponse[];

                    setProcessingToolCalls(processing);

                    console.warn("agentToolCallStart", agentToolCallStart);
                } else if (communicationData.type === "agentToolCallResult") {
                    const agentToolCallResult = communicationData as RealtimeVoiceAgentCommunicationDataAgentToolCallResult;
                    const toolCallResponse = responses.current[agentToolCallResult.toolCallId] as ToolCallResponse;
                    toolCallResponse.result = agentToolCallResult.result;
                    toolCallResponse.status = "done";

                    const processing = Object.values(responses.current).filter((r) => {
                        if (r.type == "toolCall") {
                            const toolCallResponse = r as ToolCallResponse;
                            return toolCallResponse.status == "processing";
                        } else {
                            return false;
                        }
                    }) as ToolCallResponse[];

                    setProcessingToolCalls(processing);

                    console.warn("agentToolCallResult", agentToolCallResult);
                } else {
                    console.warn("unknown data", communicationData);
                }
            } else if (event.data instanceof ArrayBuffer) {
                (async () => {
                    const int16 = new Int16Array(event.data);
                    const float32 = new Float32Array(int16.length);
                    for (let i = 0; i < int16.length; i++) {
                        float32[i] = int16[i] / 0x8000;
                    }
                    // const output = await resample(float32, 24000, 48000);
                    const output = await resample(float32, 24000, 24000);

                    if (latestResponseIdRef.current != null && responses.current[latestResponseIdRef.current] != undefined) {
                        const responseVoiceBuffer = (responses.current[latestResponseIdRef.current] as VoiceResponse).voiceBuffer;
                        const newResponseVoiceBuffer = new Float32Array(responseVoiceBuffer.length + output.length);
                        newResponseVoiceBuffer.set(responseVoiceBuffer);
                        newResponseVoiceBuffer.set(output, responseVoiceBuffer.length);
                        (responses.current[latestResponseIdRef.current] as VoiceResponse).voiceBuffer = newResponseVoiceBuffer;
                    }
                })();
            } else {
                console.error("unknown data", data);
            }
        };

        // Recorderの設定
        currentRecorder.setAudioDataCallback({
            onAudioReceived: async (audioData: Float32Array) => {
                if (greetingDetectedRef.current == false) {
                    return;
                }
                // const input = await resample(audioData, 48000, 24000);
                const input = await resample(audioData, 24000, 24000);
                const int16Buffer = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                if (wsRef.current && wsRef.current.readyState === 1) {
                    wsRef.current.send(int16Buffer.buffer);
                }
            },
        });
        currentRecorder.setVadCallback({
            onVadStateReceived: (result: VADWorkerVadResponse) => {
                if (vadStatusRef.current == "inactive" && result.inSpeech == "active") {
                    setVadStatus("active");
                    vadStatusRef.current = "active";

                    // const doneResponses = Object.values(voiceResponses.current).filter((v) => v.status == "done");
                    Object.values(responses.current)
                        .filter((v) => {
                            if (v.type == "voice") {
                                const voiceResponse = v as VoiceResponse;
                                return voiceResponse.playingStatus != "done" && voiceResponse.playingStatus != "skipped";
                            } else {
                                return false;
                            }
                        })
                        .forEach((v) => {
                            if (v.type == "voice") {
                                const voiceResponse = v as VoiceResponse;
                                voiceResponse.playingStatus = "skipped";
                                console.log("skip", voiceResponse.responseId, voiceResponse.text);
                            }
                        });
                    currentRecorder?.truncateOutputBuffer();
                } else if (vadStatusRef.current == "active" && result.inSpeech == "inactive") {
                    vadStatusRef.current = "inactive";
                    setVadStatus("inactive");
                }
            },
        });
        currentRecorder.start();
        currentRecorder.startVad();
    };

    const stopRecording = async () => {
        setIsRecording(false);
        const currentRecorder = recorder;
        if (currentRecorder == null) return;
        await currentRecorder.stop();
        currentRecorder.stopVad();

        if (wsRef.current != null) {
            wsRef.current.close();
            wsRef.current = null;
        }
        // responseIdQueueRefを空にする
        responseIdQueueRef.current = [];
        // voiceResponsesを空にする
        responses.current = {};
    };

    const playingResponseArea = useMemo(() => {
        if (!playingResponse) {
            return (
                <div className="response-area">
                    <div className="response-placeholder">
                        <div className="placeholder-icon">🎤</div>
                        <p>{t("startVoiceInput")}</p>
                    </div>
                </div>
            );
        }

        const nowTime = Date.now();
        const playTime = (nowTime - playingResponse.playingStartTime) / 1000;
        const playRate = playTime / playingResponse.playingDuration;
        const displayTextLength = Math.ceil(playingResponse.text.length * playRate);
        const displayText = playingResponse.text.slice(0, displayTextLength);

        return (
            <div className="response-area">
                <div className="response-content">
                    <div className="response-text">
                        <h3>{t("aiResponse")}</h3>
                        <div className="text-display">{displayText || t("generatingResponse")}</div>
                    </div>

                    <div className="response-status">
                        <div className="status-item">
                            <span className="status-label">{t("status")}:</span>
                            <span className={`status-value ${playingResponse.status}`}>
                                {playingResponse.status === "speaking"
                                    ? t("receiving")
                                    : playingResponse.status === "completed" || playingResponse.status === "cancelled"
                                    ? t("completed")
                                    : playingResponse.status}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">{t("progressRate")}:</span>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min(playRate * 100, 100)}%` }}></div>
                            </div>
                            <span className="progress-text">{Math.round(playRate * 100)}%</span>
                        </div>
                    </div>
                    <div>
                        {processingToolCalls.map((v) => {
                            return <div key={v.callId}>{v.name}</div>;
                        })}
                    </div>

                    {playingResponse.status === "incomplete" && (
                        <>
                            <div className="info-link">
                                <div style={{ marginBottom: "0.5rem" }}>
                                    <span style={{ fontWeight: "bold", fontSize: "1.2rem", color: "red" }}>
                                        {t("errorPrefix")} {playingResponse.status} {playingResponse.statusDetailsReason}
                                    </span>
                                </div>
                                <a
                                    href="https://community.openai.com/t/realtime-api-incomplete-response-when-input-is-in-a-non-english-language-reason-content-filter/1013576"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    💡 {t("contentFilterIssue")}
                                </a>
                            </div>
                        </>
                    )}

                    <details className="response-details">
                        <summary>{t("detailInfo")}</summary>
                        <div className="details-content">
                            <div className="detail-item">
                                <span className="detail-label">{t("responseId")}</span>
                                <span className="detail-value">{playingResponse.responseId}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">{t("statusDetailsType")}</span>
                                <span className="detail-value">{playingResponse.statusDetailsType || t("notAvailable")}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">{t("statusDetailsReason")}</span>
                                <span className="detail-value">{playingResponse.statusDetailsReason || t("notAvailable")}</span>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        );
    }, [playingResponse, processingToolCalls, t]);

    return (
        <div className="app">
            <div className="header">
                <h1>{t("title")}</h1>
                <p>{t("subtitle")}</p>
                <div className="language-selector">
                    <label>{t("language")}: </label>
                    <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                        <option value="ja">{t("languages.ja")}</option>
                        <option value="en">{t("languages.en")}</option>
                        <option value="zh">{t("languages.zh")}</option>
                        <option value="ko">{t("languages.ko")}</option>
                        <option value="es">{t("languages.es")}</option>
                        <option value="ru">{t("languages.ru")}</option>
                    </select>
                </div>
            </div>

            <div className="control-panel">
                <div className="main-controls">
                    <button className={`record-button ${isRecording ? "recording" : "not-recording"}`} onClick={isRecording ? stopRecording : startRecording}>
                        {isRecording ? t("stopRecording") : t("startRecording")}
                    </button>
                </div>

                <div className="status-indicators">
                    <div className="status-indicator">
                        <div className={`status-dot ${vadStatus === "active" ? "active" : ""}`}></div>
                        <span>
                            {t("voiceDetection")}: {vadStatus === "active" ? t("active") : t("waiting")}
                        </span>
                    </div>
                </div>

                <audio id="audio" controls hidden></audio>
            </div>

            {playingResponseArea}
        </div>
    );
}

/**
 * WebAudio APIのOfflineAudioContextを使ってリサンプリングする関数
 * @param input Float32Array - 入力音声データ
 * @param fromSampleRate number - 元のサンプリングレート
 * @param toSampleRate number - 変換後のサンプリングレート
 * @returns Promise<Float32Array> - リサンプリング後の音声データ
 */
async function resample(input: Float32Array, fromSampleRate: number, toSampleRate: number): Promise<Float32Array> {
    if (fromSampleRate == toSampleRate) {
        return input;
    }
    const numChannels = 1;
    const originalBuffer = new AudioBuffer({
        length: input.length,
        numberOfChannels: numChannels,
        sampleRate: fromSampleRate,
    });
    originalBuffer.copyToChannel(input, 0);

    const duration = input.length / fromSampleRate;
    const targetLength = Math.ceil(duration * toSampleRate);
    const offlineCtx = new OfflineAudioContext(numChannels, targetLength, toSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = originalBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();
    const output = new Float32Array(renderedBuffer.length);
    renderedBuffer.copyFromChannel(output, 0);
    return output;
}

export default App;
