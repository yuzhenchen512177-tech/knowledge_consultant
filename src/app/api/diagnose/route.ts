import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { kimi, KIMI_MODEL } from "@/lib/kimi";

interface KnowledgePoint {
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

const DIAGNOSE_SYSTEM = `你是一位资深高中数学老师。
你将收到：
1) 当前学生错题的薄弱知识点统计（按错的次数排序）
2) 全部知识点目录（id / 中文名 / 章节 / 父级 tag）

请输出严格的 JSON，格式如下：
{
  "weak_points": "用一句话说明：该学生薄弱的知识点是 X、Y、Z（结合知识点中文名，自然语言）",
  "structure": "用一句话说明：这些薄弱点在整个知识体系中的结构关系（基于父子层级和章节关系推测，可指出是某条主线上的连锁缺口）",
  "focus": "用一句话说明：基于结构关系，当前最应该着重强化的是哪个知识点，原因是什么"
}

要求：
- 三句都必须是完整通顺的一句中文；
- 不要 markdown，不要解释，只返回上述 JSON 对象本身。`;

function statByTag(mistakes: Mistake[], knowledge: KnowledgePoint[]): TagStat[] {
  const nameMap = new Map(knowledge.map((k) => [k.id, k.name]));
  const counter = new Map<string, number>();
  for (const m of mistakes) {
    for (const t of m.tags) {
      counter.set(t, (counter.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counter.entries())
    .map(([tag, wrong_count]) => ({
      tag,
      name: nameMap.get(tag) ?? tag,
      wrong_count,
    }))
    .sort((a, b) => b.wrong_count - a.wrong_count);
}

function recommendProblems(
  problems: Problem[],
  weakTags: TagStat[],
  limit: number
): Problem[] {
  const weight = new Map(weakTags.map((s) => [s.tag, s.wrong_count]));
  const scored = problems.map((p) => {
    const score = p.tags.reduce((sum, t) => sum + (weight.get(t) ?? 0), 0);
    return { p, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function POST(req: NextRequest) {
  if (!process.env.MOONSHOT_API_KEY) {
    return NextResponse.json({ error: "未配置 MOONSHOT_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const mistakes: Mistake[] = body.mistakes ?? [];

    if (mistakes.length < 5) {
      return NextResponse.json({ error: "错题数量需 ≥ 5 道" }, { status: 400 });
    }

    const knowledge: KnowledgePoint[] = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "knowledge.json"), "utf-8")
    );
    const problems: Problem[] = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "problems.json"), "utf-8")
    );

    const tagStats = statByTag(mistakes, knowledge);

    if (tagStats.length === 0) {
      return NextResponse.json(
        { error: "错题未识别出有效知识点 tag，无法生成诊断" },
        { status: 422 }
      );
    }

    const userPrompt = `薄弱知识点统计（按错的次数降序）：
${tagStats.map((s) => `- ${s.tag} (${s.name}) × ${s.wrong_count}`).join("\n")}

完整知识点目录：
${JSON.stringify(knowledge, null, 2)}`;

    const completion = await kimi.chat.completions.create({
      model: KIMI_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: DIAGNOSE_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const report = JSON.parse(cleaned) as {
      weak_points: string;
      structure: string;
      focus: string;
    };

    const recommended = recommendProblems(problems, tagStats, 5);

    return NextResponse.json({
      success: true,
      tag_stats: tagStats,
      report,
      recommended,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
