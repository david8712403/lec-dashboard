import './globals.css';
import Script from 'next/script';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/AppShell';

export const metadata = {
  title: 'LEC Dashboard',
  description: 'Learning Enhancement Center dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <head>
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
