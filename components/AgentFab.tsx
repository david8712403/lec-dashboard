import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';

export const AgentFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call the Agent API
    alert(`[Agent Skill Triggered]: ${input}`);
    setInput('');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="bg-indigo-600 p-4 flex justify-between items-center">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <Bot size={18} />
                    AI Copilot
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                    <X size={18} />
                </button>
            </div>
            <div className="p-4 bg-slate-50 min-h-[100px] text-sm text-slate-600">
                <p>我可以協助您：</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>快速新增個案</li>
                    <li>幫某人安排固定時段</li>
                    <li>批量登記本週到課</li>
                    <li>記錄繳費與發票</li>
                </ul>
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="輸入指令，例如：幫王小明請假..."
                    className="flex-1 text-sm bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-0 rounded-lg px-3 py-2"
                    autoFocus
                />
                <button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">
                    <Send size={16} />
                </button>
            </form>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all ${
            isOpen ? 'bg-slate-700 rotate-90' : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white`}
      >
        <Bot size={24} />
      </button>
    </div>
  );
};
