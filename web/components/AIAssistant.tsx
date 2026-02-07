
import React, { useState, useRef, useEffect } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { BotIcon, XIcon, MessageCircleIcon } from './Icons';
import { API_BASE_URL } from '@/hooks/useDashboardData';

export const AIAssistant: React.FC = () => {
  const apiBaseUrl = API_BASE_URL;
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = 'lec-chatkit-session';
    let current = window.localStorage.getItem(key);
    if (!current) {
      current = window.crypto.randomUUID();
      window.localStorage.setItem(key, current);
    }
    setSessionId(current);
  }, []);

  const { control } = useChatKit({
    api: {
      url: `${apiBaseUrl}/api/chatkit`,
      domainKey: 'lec-local',
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (sessionId) {
          headers.set('x-chatkit-session', sessionId);
        }
        return fetch(input, { ...init, headers, credentials: 'include' });
      },
    },
    header: {
      title: { text: 'LEC AI 助手' },
    },
    history: {
      enabled: true,
      showDelete: true,
      showRename: true,
    },
    startScreen: {
      greeting: '你好！我是你的 LEC 助理。',
      prompts: [
        { label: '查詢所有個案', prompt: '我有哪些個案？' },
        { label: '查李小花年齡', prompt: '李小花幾歲？' },
        { label: '今天課表', prompt: '幫我查今天的課表' },
      ],
    },
    theme: {
      colorScheme: 'light',
      radius: 'round',
      density: 'compact',
    },
  });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div ref={widgetRef} className="mb-4 w-[380px] h-[560px] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <BotIcon className="w-5 h-5" />
              <span className="font-bold text-sm">LEC AI 助手</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <ChatKit control={control} className="flex-1 min-h-0" />
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
