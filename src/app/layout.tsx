import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "应试咨询 Agent",
  description: "基于个人错题的高中数学应试咨询",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">应试咨询 Agent</h1>
            <nav className="flex gap-6 text-sm text-gray-500">
              <a href="/" className="hover:text-gray-900 transition-colors">首页</a>
              <a href="/diagnose" className="hover:text-gray-900 transition-colors">错题诊断</a>
              <a href="/admin" className="hover:text-gray-900 transition-colors">管理员</a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
