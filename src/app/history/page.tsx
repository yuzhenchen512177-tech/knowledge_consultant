"use client";

import { useState, useEffect } from "react";
import {
  getAllDiagnoses,
  getSessionsByDiagnosis,
  type DiagnoseRecord,
  type PracticeSessionRecord,
} from "@/lib/db";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionRow({ session }: { session: PracticeSessionRecord }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-700">第 {session.round} 轮</span>
      <span className="text-gray-500 text-xs">{formatDate(session.created_at)}</span>
      <span className="font-medium text-indigo-700">
        {session.correct_count} / {session.total_count} 题正确
      </span>
    </div>
  );
}

function DiagnoseCard({ record }: { record: DiagnoseRecord }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadSessions() {
    if (loaded) return;
    const data = await getSessionsByDiagnosis(record.id);
    setSessions(data.sort((a, b) => a.round - b.round));
    setLoaded(true);
  }

  function toggle() {
    setOpen((v) => !v);
    if (!open) loadSessions();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{record.input_summary}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-500">
            薄弱 tag × {record.tag_stats.length}
          </span>
          <span className="text-xs text-indigo-500">{open ? "收起 ▲" : "查看 ▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Report */}
          <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">诊断报告</p>
            <p className="text-sm text-indigo-900">
              <span className="font-medium">① 薄弱点：</span>
              {record.report.weak_points}
            </p>
            <p className="text-sm text-indigo-900">
              <span className="font-medium">② 结构关系：</span>
              {record.report.structure}
            </p>
            <p className="text-sm text-indigo-900">
              <span className="font-medium">③ 应强化：</span>
              {record.report.focus}
            </p>
          </div>

          {/* Tag stats */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              薄弱 tag 分布
            </p>
            <div className="flex flex-wrap gap-2">
              {record.tag_stats.map((s) => (
                <span
                  key={s.tag}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                >
                  <code>{s.tag}</code>
                  <span className="text-gray-400">·</span>
                  <span>{s.name}</span>
                  <span className="font-medium text-red-500">×{s.wrong_count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Practice sessions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              答题记录
            </p>
            {!loaded ? (
              <p className="text-xs text-gray-400">加载中...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-gray-400">暂无答题记录</p>
            ) : (
              <div>
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnoseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDiagnoses()
      .then((data) => {
        setDiagnoses(data.sort((a, b) => b.created_at - a.created_at));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">诊断历史</h2>
        <p className="text-gray-500 text-sm">浏览器本地存储，刷新不丢失。点击条目可查看报告与答题记录。</p>
      </div>

      {loading && (
        <p className="text-gray-400 text-sm animate-pulse">加载中...</p>
      )}

      {!loading && diagnoses.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">暂无历史记录，先去上传错题吧。</p>
          <a
            href="/diagnose"
            className="mt-3 inline-block text-indigo-600 text-sm underline hover:text-indigo-800"
          >
            前往错题诊断 →
          </a>
        </div>
      )}

      <div className="space-y-3">
        {diagnoses.map((d) => (
          <DiagnoseCard key={d.id} record={d} />
        ))}
      </div>
    </div>
  );
}
