export const RealtimeVoiceAgentCommunicationDataTypes = {
    agentResponseCreated: "agentResponseCreated",
    agentSpeaker: "agentSpeaker",
    agentWriting: "agentWriting",
    agentSpeakingDone: "agentSpeakingDone",
    agentResponseDone: "agentResponseDone",
    agentToolCallStart: "agentToolCallStart",
    agentToolCallResult: "agentToolCallResult",
} as const;

export type RealtimeVoiceAgentCommunicationDataTypes = (typeof RealtimeVoiceAgentCommunicationDataTypes)[keyof typeof RealtimeVoiceAgentCommunicationDataTypes];

export type RealtimeVoiceAgentCommunicationData = {
    type: RealtimeVoiceAgentCommunicationDataTypes;
};

export type RealtimeVoiceAgentCommunicationDataAgentResponseCreated = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentResponseCreated;
    conversationId: string;
    responseId: string;
};

export type RealtimeVoiceAgentCommunicationDataAgentSpeaker = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentSpeaker;
    responseId: string;
};

export type RealtimeVoiceAgentCommunicationDataAgentWriting = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentWriting;
    text: string;
    role: "user" | "assistant";
};

export type RealtimeVoiceAgentCommunicationDataAgentSpeakingDone = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentSpeakingDone;
    responseId: string;
};
export type RealtimeVoiceAgentCommunicationDataAgentResponseDone = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentResponseDone;
    conversationId: string;
    responseId: string;
    status: string;
    status_details_type: string;
    status_details_reason: string;
};

export type RealtimeVoiceAgentCommunicationDataAgentToolCallStart = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentToolCallStart;
    toolCallId: string;
    toolName: string;
    toolDescription: string;
    args: any;
};

export type RealtimeVoiceAgentCommunicationDataAgentToolCallResult = {
    type: typeof RealtimeVoiceAgentCommunicationDataTypes.agentToolCallResult;
    toolCallId: string;
    toolName: string;
    result: string;
};
