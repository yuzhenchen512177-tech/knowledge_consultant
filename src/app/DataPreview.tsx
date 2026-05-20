"use client";

import { useEffect, useState } from "react";
import KnowledgeTree, { type KnowledgeItem } from "./KnowledgeTree";
import ProblemLibrary, { type Problem } from "./ProblemLibrary";

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

  return (
    <div className="space-y-6">
      <KnowledgeTree knowledge={knowledge} />
      <ProblemLibrary problems={problems} knowledge={knowledge} />
    </div>
  );
}
