import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import path from "path";
import { getKimiClient, KIMI_MODEL } from "@/lib/kimi";

const SYSTEM_PROMPT = `你是一个高中数学知识点结构化助手。
用户会给你提供知识点目录/清单文本，请你输出严格的 JSON 数组，每个元素格式如下：
{
  "id": "唯一的英文 tag，如 func.domain",
  "name": "知识点中文名",
  "chapter": "所在章节名",
  "parent_tag": "父知识点的 id，若是顶层则为 null"
}
只返回 JSON 数组，不要有任何多余的文字或 markdown 代码块标记。`;

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

    type MessageContent =
      | { type: "text"; text: string }
      | { type: "file"; file: { file_id: string } };

    let userContent: MessageContent[];

    if (file && file.size > 0) {
      const fileId = await uploadFileToMoonshot(file);
      userContent = [
        { type: "file", file: { file_id: fileId } },
        { type: "text", text: "请解析上传的知识点文档，输出 JSON 数组。" },
      ];
    } else if (text?.trim()) {
      userContent = [{ type: "text", text: text.trim() }];
    } else {
      return NextResponse.json({ error: "请提供文件或文本内容" }, { status: 400 });
    }

    const kimi = getKimiClient();
    const completion = await kimi.chat.completions.create({
      model: KIMI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: userContent as any },
      ],
    });

    const raw = completion.choices[0].message.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    const outputPath = path.join(process.cwd(), "data", "knowledge.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
