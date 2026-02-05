
import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, XIcon, MessageCircleIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Fix: Track chat history for contextual conversations
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: '你好！我是你的 LEC 助理。我可以協助你：\n1. 查詢個案上課狀況\n2. 建議 PC 個案摘要\n3. 協助計算學費或課程安排問題' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Fix: Implemented send message logic using Gemini API
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Fix: Create new GoogleGenAI instance right before the call to ensure current configuration
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare the history from current messages
      const contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: '你是一個名為 LEC AI 的專業特教助理。你負責協助特教中心 (Learning Enhancement Center) 的老師與行政人員。你的語氣應友善、專業且精確。你可以回答關於個案管理、教學建議與行政流程的問題。',
        },
      });

      const botResponse = response.text || '抱歉，我暫時無法回答您的問題。';
      setMessages(prev => [...prev, { role: 'model', text: botResponse }]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages(prev => [...prev, { role: 'model', text: '發生連線錯誤，請稍後再試。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 h-[450px] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <BotIcon className="w-5 h-5" />
              <span className="font-bold text-sm">LEC AI 助手</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 p-4 bg-slate-50 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'model' ? 'bg-indigo-100' : 'bg-slate-200'}`}>
                  {msg.role === 'model' ? <BotIcon className="w-4 h-4 text-indigo-600" /> : <div className="text-[10px] font-bold">ME</div>}
                </div>
                <div className={`p-2 rounded-lg shadow-sm text-sm border max-w-[80%] whitespace-pre-wrap ${msg.role === 'model' ? 'bg-white text-slate-700' : 'bg-indigo-600 text-white border-indigo-600'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-4 h-4 text-indigo-600 animate-pulse" />
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm text-sm border text-slate-400 italic">
                  正在思考中...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-white flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="輸入訊息..." 
              className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <MessageCircleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-transform hover:scale-105 ${isOpen ? 'bg-slate-700 text-white rotate-90' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'}`}
      >
        {isOpen ? <XIcon className="w-6 h-6" /> : <MessageCircleIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};
