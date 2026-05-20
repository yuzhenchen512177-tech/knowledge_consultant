import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

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

function recommendProblems(
  problems: Problem[],
  weakTags: TagStat[],
  excludeIds: Set<string>,
  limit: number
): Problem[] {
  const weight = new Map(weakTags.map((s) => [s.tag, s.wrong_count]));
  const scored = problems
    .filter((p) => !excludeIds.has(p.id) && Object.keys(p.options).length > 0)
    .map((p) => ({
      p,
      score: p.tags.reduce((sum, t) => sum + (weight.get(t) ?? 0), 0),
    }));
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tag_stats: TagStat[] = body.tag_stats ?? [];
    const exclude_ids: string[] = body.exclude_ids ?? [];
    const limit: number = body.limit ?? 5;

    const problems: Problem[] = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "problems.json"), "utf-8")
    );

    const result = recommendProblems(problems, tag_stats, new Set(exclude_ids), limit);
    return NextResponse.json({ problems: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
