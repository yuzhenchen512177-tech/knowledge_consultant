"use client";

import { useMemo, useState } from "react";
import MathText from "@/components/MathText";
import type { KnowledgeItem } from "./KnowledgeTree";

export interface Problem {
  id: string;
  mother_id?: string;
  category?: string;
  name: string;
  source?: string;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  thinking_path: string;
  tags: string[];
  variants?: ProblemVariant[];
  excerpt?: string;
}

interface ProblemVariant {
  id: string;
  name: string;
  mother_id?: string;
  source?: string;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  tags: string[];
}

function tagLabel(id: string, tagNameMap: Map<string, string>) {
  const name = tagNameMap.get(id) ?? id;
  return name.replace(/^\d+(?:\.\d+)*\s*/, "").replace(/^第[一二三四五六七八九十]+章\s*/, "");
}

function ProblemDetail({
  problem,
  tagNameMap,
}: {
  problem: Problem;
  tagNameMap: Map<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div className="border-b border-gray-100 pb-4">
        <p className="mb-1 text-xs font-medium text-gray-400">{problem.category ?? "母题"}</p>
        <h4 className="text-xl font-semibold text-gray-900">{problem.name}</h4>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-400">题目</p>
        <MathText content={problem.stem} inline={false} className="text-sm leading-7 text-gray-800" />
        {Object.keys(problem.options).length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(problem.options).map(([key, value]) => (
              <div key={key} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="font-semibold">{key}.</span>{" "}
                <MathText content={value} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-400">对应知识点标签</p>
        <div className="flex flex-wrap gap-2">
          {problem.tags.map((tag) => (
            <a
              key={tag}
              href={`#knowledge-${encodeURIComponent(tag)}`}
              className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
              title={tag}
            >
              {tagLabel(tag, tagNameMap)}
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-green-50 p-3">
        <p className="mb-1 text-xs font-medium text-green-700">答案</p>
        <MathText content={problem.answer || "暂未提供"} inline={false} className="text-sm leading-7 text-green-900" />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="mb-2 text-sm font-semibold text-amber-900">解析</p>
        <MathText content={problem.explanation || "暂未提供解析"} inline={false} className="text-sm leading-7 text-amber-950" />
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
        <p className="mb-1 text-xs font-medium text-gray-500">预留变式题位置</p>
        {(problem.variants ?? []).length > 0 ? (
          <div className="space-y-3">
            {problem.variants!.map((variant, index) => (
              <details key={variant.id} className="rounded-md border border-gray-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-800">
                  变式题{index + 1}
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-400">题目</p>
                    <MathText content={variant.stem} inline={false} className="text-sm leading-7 text-gray-800" />
                    {Object.keys(variant.options).length > 0 && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {Object.entries(variant.options).map(([key, value]) => (
                          <div key={key} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            <span className="font-semibold">{key}.</span>{" "}
                            <MathText content={value} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-md bg-green-50 p-3">
                    <p className="mb-1 text-xs font-medium text-green-700">答案</p>
                    <MathText content={variant.answer || "暂未提供"} inline={false} className="text-sm leading-7 text-green-900" />
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-medium text-amber-900">解析</p>
                    <MathText content={variant.explanation || "暂未提供解析"} inline={false} className="text-sm leading-7 text-amber-950" />
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">后续可在这里补充同题型变式题。</p>
        )}
      </div>

      <div className="text-xs text-gray-400">来源：{problem.source ?? "母题池"}</div>
    </div>
  );
}

export default function ProblemLibrary({
  problems,
  knowledge,
}: {
  problems: Problem[];
  knowledge: KnowledgeItem[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(problems[0]?.id ?? null);
  const tagNameMap = useMemo(() => new Map(knowledge.map((item) => [item.id, item.name])), [knowledge]);
  const grouped = useMemo(() => {
    const chapters = ["函数", "导数"];
    return chapters.map((chapter) => ({
      chapter,
      items: problems.filter((problem) => (problem.category ?? "函数") === chapter),
    }));
  }, [problems]);
  const selectedProblem = problems.find((problem) => problem.id === selectedId) ?? problems[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">母题池</h3>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
          {problems.length} 道母题
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="max-h-[680px] space-y-5 overflow-auto pr-1">
            {grouped.map(({ chapter, items }) => (
              <section key={chapter} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{chapter}</h4>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {items.length} 道
                  </span>
                </div>

                <div className="space-y-1">
                  {items.map((problem) => {
                    const isSelected = selectedProblem?.id === problem.id;
                    return (
                    <button
                        key={problem.id}
                      type="button"
                        onClick={() => setSelectedId(problem.id)}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
                        }`}
                    >
                        <span className="block truncate font-medium">{problem.name}</span>
                    </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {selectedProblem ? (
            <ProblemDetail problem={selectedProblem} tagNameMap={tagNameMap} />
          ) : (
            <p className="text-sm text-gray-500">请选择左侧母题查看内容。</p>
          )}
        </div>
      </div>
    </div>
  );
}
