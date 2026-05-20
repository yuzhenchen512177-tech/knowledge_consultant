#!/usr/bin/env python3
"""
Parse multiple-choice problems from phase_0_document/母题集合.md
Strategy: split on '---' dividers, parse each block independently.
"""
import json, re, sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).parent.parent
SRC  = ROOT / "phase_0_document" / "母题集合.md"
DST  = ROOT / "data" / "problems.json"

# ── Section-to-tag mapping ────────────────────────────────────────────────────
FUNC_TAGS = {
    1:  ["func.def"],
    2:  ["func.domain"],
    3:  ["func.analytic"],
    4:  ["func.monotonic"],
    5:  ["func.odd_even"],
    6:  ["func.monotonic", "func.odd_even"],
    7:  ["func"],
    8:  ["func.exp", "func.log"],
    9:  ["func.image"],
    10: ["func.range"],
    11: ["func.monotonic", "func.range"],
    12: ["func.quadratic", "func.range"],
    13: ["func.range"],
    14: ["func.range"],
    15: ["func.range"],
    16: ["func.range"],
    17: ["deriv.extrema"],
    18: ["func.exp", "func.log"],
    19: ["func.exp", "func.log"],
    20: ["func"],
    21: ["func.image"],
    22: ["func.image"],
    23: ["func.image"],
    24: ["func.zero"],
    25: ["func.zero"],
    26: ["func"],
    27: ["func.zero", "func.composite"],
    28: ["func"],
}
DERIV_TAGS = {
    1:  ["deriv.basic", "deriv.rules"],
    2:  ["deriv.tangent"],
    3:  ["deriv.tangent"],
    4:  ["deriv.tangent"],
    5:  ["deriv.monotonic"],
    6:  ["deriv.extrema"],
    7:  ["deriv.extrema", "deriv.optimization"],
    8:  ["deriv.extrema"],
    9:  ["deriv.extrema"],
    10: ["deriv.extrema", "deriv.optimization"],
    11: ["deriv", "func.zero"],
    12: ["deriv"],
    13: ["deriv"],
    14: ["deriv"],
    15: ["deriv"],
}

# ── Block parser ──────────────────────────────────────────────────────────────
def parse_block(block: str, chapter: str, section_num: int) -> Optional[dict]:
    """Return a problem dict if the block contains a single-answer MC question."""
    lines = [l.rstrip() for l in block.strip().splitlines()]

    # Must contain a question marker with ( ) or （　　）
    stem_lines = []
    opts_line = ""
    explanation_lines = []
    answer = ""
    found_stem = False

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Answer line (highest priority, stop searching after this)
        if "【答案】" in stripped:
            m = re.search(r"【答案】\**\s*([A-D])\b", stripped)
            if m:
                answer = m.group(1)
            i += 1
            continue

        # Explanation line
        if "【解析】" in stripped:
            rest = re.sub(r"\*\*【解析】\*\*\s*", "", stripped).strip()
            if rest:
                explanation_lines.append(rest)
            i += 1
            while i < len(lines):
                l2 = lines[i].strip()
                if "【答案】" in l2:
                    m = re.search(r"【答案】\**\s*([A-D])\b", l2)
                    if m:
                        answer = m.group(1)
                    i += 1
                    break
                if l2:
                    explanation_lines.append(l2)
                i += 1
            continue

        # Option line: starts with A. or A．
        if re.match(r"^A[.．]", stripped) and not opts_line:
            opts_line = stripped
            i += 1
            continue

        # Stem line (contains 母题 + ( ))
        if "**母题" in stripped and re.search(r"（\s*　*\s*）|\(\s*\)", stripped):
            found_stem = True
            stem_lines.append(stripped)
            i += 1
            # Collect continuation lines until blank or option line
            while i < len(lines):
                nxt = lines[i].strip()
                if not nxt:
                    break
                if re.match(r"^A[.．]", nxt) or "【解析】" in nxt or "【答案】" in nxt:
                    break
                stem_lines.append(nxt)
                i += 1
            continue

        i += 1

    if not found_stem or not opts_line or not answer:
        return None

    # Parse options
    opt_pat = re.findall(r"([A-D])[.．]\s*(.*?)(?=\s+[A-D][.．]|$)", opts_line)
    if len(opt_pat) < 4:
        return None
    options = {k: v.strip() for k, v in opt_pat}

    # Verify answer is one of the options
    if answer not in options:
        return None

    # Build stem (strip **母题XX.** prefix)
    stem_raw = " ".join(s.strip() for s in stem_lines)
    stem = re.sub(r"^\*\*母题\d+\.\*\*\s*", "", stem_raw).strip()

    explanation = " ".join(explanation_lines).strip()
    thinking_path = _build_thinking(explanation)

    # ID from 母题 number
    mid = re.search(r"母题(\d+)", stem_raw)
    pid = f"m{mid.group(1).zfill(3)}" if mid else None
    if not pid:
        return None

    tags = (FUNC_TAGS if chapter == "func" else DERIV_TAGS).get(section_num, [chapter])

    return {
        "id": pid,
        "stem": stem,
        "options": options,
        "answer": answer,
        "explanation": explanation,
        "thinking_path": thinking_path,
        "tags": tags,
    }


def _build_thinking(exp: str) -> str:
    hints = []
    if re.search(r"定义域|约束|不等式组", exp):
        hints.append("① 先列出所有约束条件（定义域不等式组），联立取交集")
    if re.search(r"奇函数|偶函数|f\(-x\)", exp):
        hints.append("② 用奇偶性将 f(-x) 转化，化简后代入已知条件")
    if re.search(r"单调递增|单调递减|单调性", exp):
        hints.append("③ 明确函数在各区间的单调方向，再比较函数值")
    if re.search(r"周期|f\(x\+\d\)", exp):
        hints.append("④ 识别周期，将自变量折叠到基本周期内计算")
    if re.search(r"Δ|判别式|有实数解", exp):
        hints.append("⑤ 令方程对 x 有实数解 ⟺ Δ≥0，建立关于参数的不等式")
    if re.search(r"f'\(x\)|导数", exp):
        hints.append("⑥ 求 f'(x)，令 f'=0 找临界点，划分单调区间后判极值")
    if re.search(r"log|对数", exp):
        hints.append("⑦ 换底统一底数，利用对数函数单调性比较大小")
    if re.search(r"指数|e\^|2\^|底数", exp):
        hints.append("⑧ 利用指数函数单调性，底数>1 时指数越大函数值越大")
    if not hints:
        hints.append("① 仔细审题，明确已知与所求；② 优先代入关键值验证选项")
    return "；".join(hints) + "。"


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    text = SRC.read_text(encoding="utf-8")

    # Split into blocks on '---' dividers
    raw_blocks = re.split(r"\n---\n", text)

    problems = {}
    chapter = "func"
    section_num = 0

    for block in raw_blocks:
        # Update chapter/section from headings inside this block
        for line in block.splitlines():
            if re.match(r"^## 版块三", line):
                chapter = "func"
            elif re.match(r"^## 版块四", line):
                chapter = "deriv"
            m = re.match(r"^### 题型 (\d+)", line)
            if m:
                section_num = int(m.group(1))

        p = parse_block(block, chapter, section_num)
        if p and p["id"] not in problems:
            problems[p["id"]] = p

    result = sorted(problems.values(), key=lambda x: x["id"])
    print(f"Parsed {len(result)} unique MC problems", file=sys.stderr)

    DST.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written → {DST}", file=sys.stderr)

    for p in result[:8]:
        print(f"  {p['id']} answer={p['answer']} tags={p['tags']}", file=sys.stderr)


if __name__ == "__main__":
    main()
