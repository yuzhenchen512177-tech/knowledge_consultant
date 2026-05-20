"use client";

import { useState, useEffect, useRef } from "react";
import MathText from "./MathText";
import { savePracticeSession } from "@/lib/db";

interface Problem {
  id: string;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  thinking_path: string;
  tags: string[];
}

interface TagStat {
  tag: string;
  name: string;
  wrong_count: number;
}

interface QuizResult {
  problem: Problem;
  userAnswer: string;
  correct: boolean;
}

type Phase = "answering" | "revealed" | "summary" | "loading" | "ended";

export default function PracticeSession({
  initialProblems,
  tagStats,
  diagnosisId,
}: {
  initialProblems: Problem[];
  tagStats: TagStat[];
  diagnosisId: string;
}) {
  const [phase, setPhase] = useState<Phase>("answering");
  const [currentProblems, setCurrentProblems] = useState<Problem[]>(initialProblems);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<QuizResult[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [allAnsweredIds, setAllAnsweredIds] = useState<string[]>(
    initialProblems.map((p) => p.id)
  );
  const [loadError, setLoadError] = useState("");
  const [poolExhausted, setPoolExhausted] = useState(false);
  const savedRoundsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (phase === "summary" && diagnosisId && roundResults.length > 0 && !savedRoundsRef.current.has(roundNumber)) {
      savedRoundsRef.current.add(roundNumber);
      savePracticeSession({
        id: `session_${diagnosisId}_${roundNumber}`,
        diagnosis_id: diagnosisId,
        created_at: Date.now(),
        round: roundNumber,
        results: roundResults.map((r) => ({
          problem_id: r.problem.id,
          user_answer: r.userAnswer,
          correct: r.correct,
        })),
        correct_count: roundResults.filter((r) => r.correct).length,
        total_count: roundResults.length,
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const currentProblem = currentProblems[currentIdx];
  const isLastQuestion = currentIdx === currentProblems.length - 1;
  const lastResult = roundResults[roundResults.length - 1];

  function handleSubmit() {
    if (!selected || !currentProblem) return;
    const result: QuizResult = {
      problem: currentProblem,
      userAnswer: selected,
      correct: selected === currentProblem.answer,
    };
    setRoundResults((prev) => [...prev, result]);
    setPhase("revealed");
  }

  function handleNext() {
    if (isLastQuestion) {
      setPhase("summary");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setPhase("answering");
    }
  }

  async function handleNextRound() {
    setPhase("loading");
    setLoadError("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag_stats: tagStats,
          exclude_ids: allAnsweredIds,
          limit: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      const newProblems: Problem[] = data.problems ?? [];
      if (newProblems.length === 0) {
        setPoolExhausted(true);
        setPhase("summary");
        return;
      }
      setAllAnsweredIds((prev) => [...prev, ...newProblems.map((p) => p.id)]);
      setCurrentProblems(newProblems);
      setCurrentIdx(0);
      setSelected(null);
      setRoundResults([]);
      setRoundNumber((n) => n + 1);
      setPhase("answering");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "未知错误");
      setPhase("summary");
    }
  }

  if (phase === "ended") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">本次练习已结束，加油！</p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm animate-pulse">正在召回新一批题目...</p>
      </div>
    );
  }

  if (phase === "summary") {
    const correctCount = roundResults.filter((r) => r.correct).length;
    return (
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center space-y-2">
          <p className="text-3xl font-bold text-indigo-900">
            {correctCount} / {roundResults.length}
          </p>
          <p className="text-sm text-indigo-700">
            本轮答对 {correctCount} 题，答错 {roundResults.length - correctCount} 题
          </p>
          {poolExhausted && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              题库中与薄弱 tag 匹配的题目已全部做完。
            </p>
          )}
          {loadError && (
            <p className="text-xs text-red-600 mt-1">{loadError}</p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {!poolExhausted && (
            <button
              onClick={handleNextRound}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              再来 5 题
            </button>
          )}
          <button
            onClick={() => setPhase("ended")}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            结束
          </button>
        </div>
      </div>
    );
  }

  // answering | revealed
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          第 {currentIdx + 1} / {currentProblems.length} 题
        </span>
        {roundResults.length > 0 && (
          <span>
            已答对 {roundResults.filter((r) => r.correct).length} /{" "}
            {roundResults.length}
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {/* Stem */}
        <div className="text-sm font-medium text-gray-900 leading-relaxed">
          <MathText content={currentProblem.stem} inline={false} />
        </div>

        {/* Options */}
        <div className="space-y-2">
          {Object.entries(currentProblem.options).map(([key, value]) => {
            const isCorrect = key === currentProblem.answer;
            const isSelected = key === selected;

            let cls =
              "flex items-start gap-2 w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ";

            if (phase === "revealed") {
              if (isCorrect) {
                cls += "bg-green-50 border-green-400 text-green-800";
              } else if (isSelected) {
                cls += "bg-red-50 border-red-400 text-red-800";
              } else {
                cls += "bg-white border-gray-200 text-gray-400";
              }
            } else {
              cls += isSelected
                ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
            }

            return (
              <button
                key={key}
                onClick={() => phase === "answering" && setSelected(key)}
                disabled={phase === "revealed"}
                className={cls}
              >
                <span className="font-semibold shrink-0">{key}.</span>
                <MathText content={value} />
              </button>
            );
          })}
        </div>

        {/* Submit */}
        {phase === "answering" && (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            提交答案
          </button>
        )}

        {/* Revealed: result + explanation + next */}
        {phase === "revealed" && lastResult && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {lastResult.correct ? (
              <p className="text-green-700 font-semibold text-sm">✓ 回答正确！</p>
            ) : (
              <p className="text-red-700 font-semibold text-sm">
                ✗ 回答错误，正确答案是{" "}
                <span className="font-bold">{currentProblem.answer}</span>
              </p>
            )}

            {currentProblem.explanation && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  解析
                </p>
                <MathText content={currentProblem.explanation} inline={false} />
              </div>
            )}

            {currentProblem.thinking_path && (
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  通用思考路径
                </p>
                <MathText content={currentProblem.thinking_path} inline={false} />
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {isLastQuestion ? "查看本轮总结" : "下一题 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
