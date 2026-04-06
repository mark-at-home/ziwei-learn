import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../lib/claude-api';
import './Chat.css';

interface ChatPanelProps {
  onSend: (messages: ChatMessage[]) => Promise<string>;
  onClose: () => void;
}

export default function ChatPanel({ onSend, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await onSend(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `抱歉，回答失败：${e instanceof Error ? e.message : '未知错误'}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">问命师</span>
        <button className="chat-close" onClick={onClose}>收起</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>基于当前命盘和分析结果，你可以自由提问</p>
            <div className="chat-suggestions">
              {['这个命盘的事业发展方向是什么？', '夫妻宫的四化对感情有什么影响？', '当前大限需要注意什么？'].map((s, i) => (
                <button key={i} className="chat-suggestion" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
            <div className="chat-msg-label">{msg.role === 'user' ? '你' : '命师'}</div>
            <div className="chat-msg-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg-label">命师</div>
            <div className="chat-msg-content chat-typing">思考中…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题…（Enter 发送，Shift+Enter 换行）"
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          发送
        </button>
      </div>
    </div>
  );
}
