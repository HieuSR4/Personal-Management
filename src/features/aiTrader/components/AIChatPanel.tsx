import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, MarketInsight, ModelMode } from "../types.ts";
import "../styles.css";

interface AIChatPanelProps {
  asset: string;
  timeframe: string;
  modelMode: ModelMode;
  insight?: MarketInsight;
}

const buildStorageKey = (asset: string, timeframe: string, mode: ModelMode) =>
  `ai-trader-chat:${asset}:${timeframe}:${mode}`;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export function AIChatPanel({ asset, timeframe, modelMode, insight }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => buildStorageKey(asset, timeframe, modelMode), [asset, timeframe, modelMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(storageKey);
    if (cached) {
      setMessages(JSON.parse(cached) as ChatMessage[]);
    } else if (insight) {
      const seedMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: `Xin chào! Đây là tóm tắt nhanh cho ${insight.asset} (${insight.timeframe}). ${insight.summary}`,
        createdAt: new Date().toISOString(),
        metadata: { generatedFrom: insight.generatedAt }
      };
      setMessages([seedMessage]);
    } else {
      setMessages([]);
    }
  }, [insight, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const synthesizeResponse = useCallback(
    (question: string): ChatMessage => {
      const indicatorHighlight = insight?.indicators
        .map((indicator) => `${indicator.name}: ${indicator.signal}`)
        .join(", ");
      const response =
        insight && indicatorHighlight
          ? `Dựa trên dữ liệu mới nhất (${new Date(insight.generatedAt).toLocaleString()}), mô hình ${
              modelMode === "reinforcement" ? "reinforcement" : "dự báo"
            } đề xuất: ${insight.keyTakeaways[0]}. Các chỉ báo chính: ${indicatorHighlight}.`
          : "Tôi sẽ ghi nhận yêu cầu của bạn và cập nhật khi có dữ liệu.";
      return {
        id: createId(),
        role: "assistant",
        content: response,
        createdAt: new Date().toISOString(),
        metadata: {
          question,
          asset,
          timeframe,
          mode: modelMode
        }
      };
    },
    [asset, timeframe, modelMode, insight]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      const assistantMessage = synthesizeResponse(trimmed);
      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage]);
      }, 400);
    },
    [input, synthesizeResponse]
  );

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-panel__header">
        <div>
          <h4>AI Market Chat</h4>
          <p className="ai-chat-panel__meta">
            {asset} · {timeframe} · {modelMode === "reinforcement" ? "Chiến lược" : "Dự báo"}
          </p>
        </div>
      </div>
      <div ref={listRef} className="ai-chat-panel__messages">
        {messages.map((message) => (
          <div key={message.id} className={`ai-chat-panel__message ai-chat-panel__message--${message.role}`}>
            <div className="ai-chat-panel__bubble">
              <p>{message.content}</p>
              <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="ai-chat-panel__empty">Chưa có hội thoại. Hãy đặt câu hỏi cho trợ lý.</p>}
      </div>
      <form className="ai-chat-panel__form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Hỏi AI: ví dụ 'Phân tích tín hiệu BTC trong 4h'"
        />
        <button type="submit">Gửi</button>
      </form>
    </div>
  );
}