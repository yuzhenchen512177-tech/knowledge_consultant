"use client";

import { useState } from "react";

type Tab = "knowledge" | "problems";
type UploadStatus = "idle" | "loading" | "success" | "error";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("knowledge");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !text.trim()) {
      setMessage("请提供 PDF 文件或粘贴文本内容");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text.trim()) formData.append("text", text);

    const endpoint = tab === "knowledge" ? "/api/parse-knowledge" : "/api/parse-problems";

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "解析失败");
      setStatus("success");
      setMessage(`成功解析 ${data.count} 条数据，已写入 data/${tab === "knowledge" ? "knowledge" : "problems"}.json`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "未知错误");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">管理员 — 内容入库</h2>
        <p className="text-gray-500 text-sm">
          上传 Phase 0 准备好的 PDF 或粘贴文本，调用 Kimi API 解析后写入本地 JSON。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["knowledge", "problems"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus("idle"); setMessage(""); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t === "knowledge" ? "知识点库 (P1-2)" : "母题池 (P1-3)"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            上传 PDF / 图片
          </label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 border-t" />
          <span>或粘贴文本</span>
          <div className="flex-1 border-t" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tab === "knowledge"
              ? "知识点清单文本（每行一个知识点，或直接粘贴目录内容）"
              : "题目文本（含题干、选项、答案、解析）"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={
              tab === "knowledge"
                ? "例如：\n第一章 函数\n  1.1 函数的定义\n  1.2 定义域与值域\n  ..."
                : "例如：\n1. 函数 f(x)=x²-2x+3 的最小值是...\nA. 2  B. 3  C. 1  D. 4\n答案：A\n解析：配方得..."
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {status === "loading" ? "Kimi 解析中，请耐心等待..." : "开始解析并入库"}
        </button>

        {status === "loading" && tab === "problems" && (
          <p className="text-xs text-gray-400">
            母题池需要对每道题单独生成思考路径，题目较多时可能需要 1-3 分钟，请勿关闭页面。
          </p>
        )}

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              status === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>注意：</strong>需要在 <code className="bg-amber-100 px-1 rounded">.env.local</code>{" "}
        中配置 <code className="bg-amber-100 px-1 rounded">MOONSHOT_API_KEY</code>，
        否则解析接口会返回错误。参考 <code className="bg-amber-100 px-1 rounded">.env.local.example</code>。
      </div>
    </div>
  );
}
