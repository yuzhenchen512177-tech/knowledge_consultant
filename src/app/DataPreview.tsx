"use client";

import { useEffect, useState } from "react";
import MathText from "@/components/MathText";

interface KnowledgeItem {
  id: string;
  name: string;
  chapter: string;
  parent_tag: string | null;
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

export default function DataPreview() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [kRes, pRes] = await Promise.all([
          fetch("/api/knowledge"),
          fetch("/api/problems"),
        ]);
        if (!kRes.ok || !pRes.ok) throw new Error("API 请求失败");
        setKnowledge(await kRes.json());
        setProblems(await pRes.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "未知错误");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">加载中...</p>;
  if (error) return <p className="text-red-500 text-sm">错误：{error}</p>;

  const chapters = Array.from(new Set(knowledge.map((k) => k.chapter)));
  const tagNameMap = new Map(knowledge.map((k) => [k.id, k.name]));

  return (
    <div className="space-y-6">
      {/* Knowledge */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">知识点库</h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {knowledge.length} 个知识点
          </span>
        </div>
        {chapters.map((chapter) => (
          <div key={chapter} className="mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {chapter}
            </p>
            <div className="flex flex-wrap gap-2">
              {knowledge
                .filter((k) => k.chapter === chapter)
                .map((k) => (
                  <span
                    key={k.id}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                    title={k.id}
                  >
                    {k.name}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Problems */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">母题池</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {problems.length} 道题
          </span>
        </div>
        <div className="space-y-3">
          {problems.slice(0, 3).map((p) => (
            <div key={p.id} className="border border-gray-100 rounded-lg p-3 text-sm">
              <p className="text-gray-500 text-xs mb-1">{p.id}</p>
              <MathText content={p.stem} className="text-gray-800 line-clamp-2 block" />
              <div className="flex flex-wrap gap-1 mt-2">
                {p.tags.map((t) => (
                  <span key={t} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                    {tagNameMap.get(t) ?? t}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {problems.length > 3 && (
            <p className="text-xs text-gray-400 text-center">
              还有 {problems.length - 3} 道题，在管理员页可查看完整列表
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
