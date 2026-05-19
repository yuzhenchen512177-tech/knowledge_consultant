import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import path from "path";
import { kimi, KIMI_MODEL } from "@/lib/kimi";

const PARSE_SYSTEM = `你是一个高中数学题目结构化助手。
用户会给你提供母题文档，请你解析每道题并输出严格的 JSON 数组，每个元素格式如下：
{
  "id": "题目唯一编号如 p001",
  "stem": "题干（保留数学公式的原始文本）",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "answer": "正确选项字母（A/B/C/D）",
  "explanation": "标准解析",
  "thinking_path": "",
  "tags": ["相关知识点 tag 数组，如 func.domain"]
}
只返回 JSON 数组，不要有任何多余的文字或 markdown 代码块标记。`;

const THINKING_SYSTEM = `你是一位资深高中数学老师。
给定一道选择题（题干、选项、答案、解析），请为这道题生成一段"通用母题思考路径"。
要求：3-5 句话，描述解这类题的通用步骤（不针对本题具体数字），帮助学生举一反三。
只返回思考路径文本，不要有多余格式。`;

interface Problem {
  id: string;
  stem: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  thinking_path: string;
  tags: string[];
}

type MessageContent =
  | { type: "text"; text: string }
  | { type: "file"; file: { file_id: string } };

async function uploadFileToMoonshot(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "file-extract");
  const res = await fetch("https://api.moonshot.cn/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`文件上传失败: ${err}`);
  }
  const data = await res.json();
  return data.id as string;
}

async function generateThinkingPath(p: Problem): Promise<string> {
  const prompt = `题干：${p.stem}\n选项：${JSON.stringify(p.options)}\n答案：${p.answer}\n解析：${p.explanation}`;
  const res = await kimi.chat.completions.create({
    model: KIMI_MODEL,
    max_tokens: 512,
    messages: [
      { role: "system", content: THINKING_SYSTEM },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0].message.content?.trim() ?? "";
}

// 限制并发，避免触发速率限制
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  if (!process.env.MOONSHOT_API_KEY) {
    return NextResponse.json({ error: "未配置 MOONSHOT_API_KEY" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    let userContent: MessageContent[];

    if (file && file.size > 0) {
      const fileId = await uploadFileToMoonshot(file);
      userContent = [
        { type: "file", file: { file_id: fileId } },
        { type: "text", text: "请解析上传的题目文档，输出 JSON 数组。" },
      ];
    } else if (text?.trim()) {
      userContent = [{ type: "text", text: text.trim() }];
    } else {
      return NextResponse.json({ error: "请提供文件或文本内容" }, { status: 400 });
    }

    // Step 1: 解析所有题目结构
    const parseCompletion = await kimi.chat.completions.create({
      model: KIMI_MODEL,
      max_tokens: 16000,
      messages: [
        { role: "system", content: PARSE_SYSTEM },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: userContent as any },
      ],
    });

    const raw = parseCompletion.choices[0].message.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const problems: Problem[] = JSON.parse(cleaned);

    // Step 2: 并发 3 个生成思考路径
    const enriched = await mapWithConcurrency(problems, 3, async (p) => ({
      ...p,
      thinking_path: await generateThinkingPath(p),
    }));

    const outputPath = path.join(process.cwd(), "data", "problems.json");
    writeFileSync(outputPath, JSON.stringify(enriched, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
