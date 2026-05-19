"use client";

import { useState, useEffect } from "react";
import MathText from "@/components/MathText";

type Status = "idle" | "parsing" | "diagnosing" | "done" | "error";

interface Mistake {
  id: string;
  stem: string;
  user_answer: string;
  correct_answer: string;
  tags: string[];
}

interface TagStat {
  tag: string;
  name: string;
  wrong_count: number;
}

interface Problem {
  id: string;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  thinking_path: string;
  tags: string[];
}

interface Diagnosis {
  tag_stats: TagStat[];
  report: { weak_points: string; structure: string; focus: string };
  recommended: Problem[];
}

const MIN_MISTAKES = 5;

export default function DiagnosePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [mistakes, setMistakes] = useState<Mistake[] | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [tagNameMap, setTagNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) =>
        setTagNameMap(new Map(data.map((k) => [k.id, k.name])))
      )
      .catch(() => {});
  }, []);

  function reset() {
    setStatus("idle");
    setErrMsg("");
    setFile(null);
    setText("");
    setMistakes(null);
    setDiagnosis(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !text.trim()) {
      setErrMsg("请上传文件或粘贴错题文本");
      setStatus("error");
      return;
    }

    setStatus("parsing");
    setErrMsg("");
    setMistakes(null);
    setDiagnosis(null);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (text.trim()) formData.append("text", text);

      const parseRes = await fetch("/api/parse-mistakes", {
        method: "POST",
        body: formData,
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error ?? "错题解析失败");

      const parsed: Mistake[] = parseData.mistakes ?? [];
      setMistakes(parsed);

      if (parsed.length < MIN_MISTAKES) {
        setStatus("error");
        setErrMsg(`仅识别到 ${parsed.length} 道错题，需 ≥ ${MIN_MISTAKES} 道才能生成诊断`);
        return;
      }

      setStatus("diagnosing");
      const diagRes = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mistakes: parsed }),
      });
      const diagData = await diagRes.json();
      if (!diagRes.ok) throw new Error(diagData.error ?? "诊断生成失败");

      setDiagnosis({
        tag_stats: diagData.tag_stats,
        report: diagData.report,
        recommended: diagData.recommended,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "未知错误");
    }
  }

  const loading = status === "parsing" || status === "diagnosing";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">错题上传 & 诊断</h2>
        <p className="text-gray-500 text-sm">
          上传 PDF / 图片 / txt 或粘贴文本，Kimi 自动识别错题（至少 {MIN_MISTAKES} 道）→
          生成三句话诊断 + 推荐 5 道针对性练习。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            上传文件（PDF / 图片 / .txt）
          </label>
          <input
            type="file"
            accept=".pdf,.txt,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500">已选：{file.name}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 border-t" />
          <span>或粘贴文本</span>
          <div className="flex-1 border-t" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            错题文本（请尽量包含题干、你的作答、正确答案）
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            disabled={loading}
            placeholder={`例如：
1. 函数 f(x)=√(x-1)+1/(x-3) 的定义域是
A. [1,3)∪(3,+∞)  B. (1,3)∪(3,+∞)  C. [1,+∞)  D. (1,+∞)
我的答案：C
正确答案：A

2. ...（至少 ${MIN_MISTAKES} 道）`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y disabled:opacity-60"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === "parsing"
              ? "Kimi 解析错题中..."
              : status === "diagnosing"
              ? "正在生成诊断..."
              : "开始诊断"}
          </button>
          {(status === "done" || status === "error") && (
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              重新上传
            </button>
          )}
        </div>

        {status === "error" && errMsg && (
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {errMsg}
          </div>
        )}
      </form>

      {mistakes && mistakes.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">
            识别出的错题（{mistakes.length} 道）
          </h3>
          <div className="space-y-3">
            {mistakes.map((m, idx) => (
              <div
                key={m.id || idx}
                className="bg-white border border-gray-200 rounded-lg p-4 text-sm"
              >
                <div className="font-medium text-gray-900 mb-1">
                  Q{idx + 1}. <MathText content={m.stem} />
                </div>
                <div className="text-gray-600 text-xs flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    你的答案：<span className="font-medium text-red-600">{m.user_answer || "—"}</span>
                  </span>
                  <span>
                    正确答案：<span className="font-medium text-green-700">{m.correct_answer || "—"}</span>
                  </span>
                  <span>
                    知识点：
                    {m.tags.length > 0 ? (
                      m.tags.map((t) => (
                        <code key={t} className="bg-gray-100 px-1 rounded mx-0.5">
                          {tagNameMap.get(t) ?? t}
                        </code>
                      ))
                    ) : (
                      <span className="text-gray-400">未匹配</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {diagnosis && (
        <>
          <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
            <h3 className="text-lg font-semibold text-indigo-900">诊断报告</h3>
            <p className="text-sm text-indigo-900 leading-relaxed">
              <strong>① 薄弱点：</strong>
              {diagnosis.report.weak_points}
            </p>
            <p className="text-sm text-indigo-900 leading-relaxed">
              <strong>② 结构关系：</strong>
              {diagnosis.report.structure}
            </p>
            <p className="text-sm text-indigo-900 leading-relaxed">
              <strong>③ 当前应强化：</strong>
              {diagnosis.report.focus}
            </p>

            <details className="text-xs text-indigo-800 pt-2 border-t border-indigo-200">
              <summary className="cursor-pointer">查看薄弱 tag 统计</summary>
              <ul className="mt-2 space-y-0.5">
                {diagnosis.tag_stats.map((s) => (
                  <li key={s.tag}>
                    <code className="bg-white px-1 rounded">{s.tag}</code>{" "}
                    {s.name} —— 错 {s.wrong_count} 次
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">
              推荐练习（{diagnosis.recommended.length} 道，按薄弱度排序）
            </h3>
            {diagnosis.recommended.length === 0 ? (
              <p className="text-sm text-gray-500">母题池中暂无匹配的题目。</p>
            ) : (
              <div className="space-y-3">
                {diagnosis.recommended.map((p, idx) => (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 text-sm"
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      推荐 {idx + 1}. <MathText content={p.stem} />
                    </div>
                    <ul className="text-gray-700 text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-2">
                      {Object.entries(p.options).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-semibold">{k}.</span>{" "}
                          <MathText content={v} />
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                      <span>题号：{p.id}</span>
                      <span>
                        知识点：
                        {p.tags.map((t) => (
                          <code key={t} className="bg-gray-100 px-1 rounded mx-0.5">
                            {tagNameMap.get(t) ?? t}
                          </code>
                        ))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-400">
              答题交互将在 Phase 3 中实现。当前仅展示题目召回结果。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
