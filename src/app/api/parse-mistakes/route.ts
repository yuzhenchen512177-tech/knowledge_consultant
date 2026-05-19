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

interface Mistake {
  id: string;
  stem: string;
  user_answer: string;
  correct_answer: string;
  tags: string[];
}

type MessageContent =
  | { type: "text"; text: string }
  | { type: "file"; file: { file_id: string } };

function buildSystemPrompt(knowledge: KnowledgePoint[]): string {
  const tagList = knowledge
    .map((k) => `${k.id} (${k.name})`)
    .join("\n");
  return `你是一个高中数学错题结构化助手。
用户会上传或粘贴一份错题集，每道题应包含：题干、用户作答、正确答案（若缺失你需根据题目推断）。
请输出严格的 JSON 数组，每个元素格式如下：
{
  "id": "m001 形式的递增编号",
  "stem": "题干文字（保留数学公式原样）",
  "user_answer": "用户作答（A/B/C/D 或文字；缺失填空字符串）",
  "correct_answer": "正确答案（A/B/C/D 或文字）",
  "tags": ["从下方知识点 tag 列表里挑 1-3 个最相关的 id"]
}

可选的知识点 tag 列表（id 与中文名对照）：
${tagList}

规则：
- 必须只使用上面列表中存在的 tag id；
- 如果实在无法从列表中匹配，挑最接近的父级 tag；
- 只返回 JSON 数组本身，不要 markdown、不要解释文字。`;
}

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

export async function POST(req: NextRequest) {
  if (!process.env.MOONSHOT_API_KEY) {
    return NextResponse.json({ error: "未配置 MOONSHOT_API_KEY" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    const knowledgePath = path.join(process.cwd(), "data", "knowledge.json");
    const knowledge: KnowledgePoint[] = JSON.parse(readFileSync(knowledgePath, "utf-8"));

    let userContent: MessageContent[];

    if (file && file.size > 0) {
      const fileId = await uploadFileToMoonshot(file);
      userContent = [
        { type: "file", file: { file_id: fileId } },
        { type: "text", text: "请解析上传的错题文档，输出 JSON 数组。" },
      ];
    } else if (text?.trim()) {
      userContent = [{ type: "text", text: text.trim() }];
    } else {
      return NextResponse.json({ error: "请提供文件或文本内容" }, { status: 400 });
    }

    const completion = await kimi.chat.completions.create({
      model: KIMI_MODEL,
      max_tokens: 8000,
      messages: [
        { role: "system", content: buildSystemPrompt(knowledge) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: userContent as any },
      ],
    });

    const raw = completion.choices[0].message.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const mistakes: Mistake[] = JSON.parse(cleaned);

    const validTagIds = new Set(knowledge.map((k) => k.id));
    const sanitized = mistakes.map((m) => ({
      ...m,
      tags: m.tags.filter((t) => validTagIds.has(t)),
    }));

    return NextResponse.json({ success: true, count: sanitized.length, mistakes: sanitized });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
