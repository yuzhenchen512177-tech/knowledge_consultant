const fs = require("fs");
const path = require("path");

const root = process.cwd();
const mdPath = path.join(root, "phase_0_document", "母题集合.md");
const knowledgePath = path.join(root, "data", "knowledge.json");

const raw = fs.readFileSync(mdPath, "utf8").replace(/^\uFEFF/, "");
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, "utf8"));
const leafIds = new Set(knowledge.filter((item) => item.is_leaf).map((item) => item.id));

function ensureTags(tags) {
  const valid = tags.filter((tag) => leafIds.has(tag));
  if (valid.length === 0) {
    throw new Error(`No leaf tags found for ${tags.join(", ")}`);
  }
  return Array.from(new Set(valid));
}

const functionTypeTags = {
  1: ["func.def.concept3", "func.def.definition4"],
  2: ["func.domain"],
  3: ["func.analytic"],
  4: ["func.monotonic.3"],
  5: ["func.odd_even.3"],
  6: ["func.monotonic.3", "func.odd_even.3"],
  7: ["func.piecewise"],
  8: ["func.monotonic.3", "func.odd_even.3"],
  9: ["func.image"],
  10: ["func.range"],
  11: ["func.range", "func.monotonic.3"],
  12: ["func.range", "func.quadratic"],
  13: ["func.range", "func.quadratic"],
  14: ["func.range"],
  15: ["func.range"],
  16: ["func.range"],
  17: ["deriv.extrema.4"],
  18: ["func.method30.4-1.rule34", "func.method30.4-3.a-0-a-neq-1-m-0-n-0"],
  19: ["func.exp.concept39", "func.log.chapter49", "func.power.concept27"],
  20: ["func.def.concept3", "func.log.chapter49"],
  21: ["func.trig.5-4.y-a-sin-omega-x-varphi-a-0-omega-0.3-y-sin-x-rightarrow-y-a-sin-omega-x-varphi"],
  22: ["func.image", "func.odd_even.3"],
  23: ["func.image", "func.zero.2"],
  24: ["func.zero.2"],
  25: ["func.zero.1", "func.zero.2"],
  26: ["func.monotonic.3", "func.zero.2"],
  27: ["func.piecewise", "func.zero.1"],
  28: ["func.method30.4-5.property53"],
};

const derivativeTypeTags = {
  1: ["deriv.basic.formulas"],
  2: ["deriv.tangent.equation"],
  3: ["deriv.tangent.equation", "deriv.basic.formulas"],
  4: ["deriv.tangent.equation"],
  5: ["deriv.monotonic.2"],
  6: ["deriv.extrema.3"],
  7: ["deriv.extrema.4"],
  8: ["deriv.extrema.2"],
  9: ["deriv.extrema.2"],
  10: ["deriv.extrema.4", "func.zero.2"],
  11: ["deriv.monotonic.2", "func.zero.2"],
  12: ["deriv.optimization"],
  13: ["deriv.optimization"],
  14: ["deriv.optimization"],
  15: ["deriv.optimization", "deriv.chain"],
};

function parseTypeNumber(typeTitle) {
  const match = /^题型\s+(\d+)/.exec(typeTitle);
  return match ? Number(match[1]) : 0;
}

function optionLineToEntry(line) {
  const match = /^([A-D])\.\s*(.+)$/.exec(line.trim());
  return match ? [match[1], match[2].trim()] : null;
}

function splitProblemBody(body) {
  const answerMatch = body.match(/\*\*【答案】\*\*/);
  const explanationMatch = body.match(/\*\*【解析】\*\*/);
  const markerPositions = [answerMatch?.index, explanationMatch?.index].filter((v) => typeof v === "number");
  const firstMarker = markerPositions.length ? Math.min(...markerPositions) : body.length;
  const question = body.slice(0, firstMarker).trim();

  let answer = "";
  if (answerMatch) {
    const start = answerMatch.index + answerMatch[0].length;
    const end = explanationMatch && explanationMatch.index > start ? explanationMatch.index : body.length;
    answer = body.slice(start, end).trim();
  }

  let explanation = "";
  if (explanationMatch) {
    const start = explanationMatch.index + explanationMatch[0].length;
    explanation = body.slice(start).replace(/\*\*【答案】\*\*[\s\S]*$/m, "").trim();
  }

  if (!answer && explanation) {
    const embedded = explanation.match(/\*\*【答案】\*\*\s*([\s\S]+?)(?:\n---|$)/);
    if (embedded) answer = embedded[1].trim();
    explanation = explanation.replace(/\*\*【答案】\*\*[\s\S]*$/m, "").trim();
  }

  const options = {};
  const questionLines = [];
  for (const line of question.split(/\r?\n/)) {
    const entry = optionLineToEntry(line);
    if (entry) {
      options[entry[0]] = entry[1];
    } else {
      questionLines.push(line);
    }
  }

  return {
    stem: questionLines.join("\n").replace(/\n---\s*$/m, "").trim(),
    options,
    answer: answer.replace(/\n---\s*$/m, "").trim(),
    explanation: explanation.replace(/\n---\s*$/m, "").trim(),
  };
}

function firstSentence(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .slice(0, 160)
    .trim();
}

function buildThinkingPath(typeTitle, tags) {
  const cleanType = typeTitle.replace(/^题型\s+\d+\s*/, "");
  return `围绕“${cleanType}”题型，先识别题目条件和对应知识点，再按标签所指向的知识方法列式、化简或分类讨论，最后回到题目要求给出结论。`;
}

let currentCategory = "";
let currentTypeTitle = "";
let currentTypeNumber = 0;
const lines = raw.split(/\r?\n/);
const problems = [];
let currentProblem = null;

function finishProblem() {
  if (!currentProblem) return;
  const parsed = splitProblemBody(currentProblem.body.join("\n"));
  const tagMap = currentCategory === "导数" ? derivativeTypeTags : functionTypeTags;
  const tags = ensureTags(tagMap[currentTypeNumber] || (currentCategory === "导数" ? ["deriv.basic.formulas"] : ["func.def.concept3"]));
  problems.push({
    id: `p${String(problems.length + 1).padStart(3, "0")}`,
    mother_id: `母题${currentProblem.number}`,
    category: currentCategory,
    name: currentTypeTitle,
    source: "母题池",
    stem: parsed.stem,
    options: parsed.options,
    answer: parsed.answer,
    explanation: parsed.explanation,
    thinking_path: buildThinkingPath(currentTypeTitle, tags),
    tags,
    variants: [],
    excerpt: firstSentence(parsed.stem),
  });
  currentProblem = null;
}

for (const line of lines) {
  const section = /^##\s+版块.+/.exec(line);
  if (section) {
    finishProblem();
    currentCategory = line.includes("导数") ? "导数" : "函数";
    continue;
  }

  const type = /^###\s+(题型\s+\d+\s+.+)$/.exec(line);
  if (type) {
    finishProblem();
    currentTypeTitle = type[1].trim();
    currentTypeNumber = parseTypeNumber(currentTypeTitle);
    continue;
  }

  const problem = /^\*\*母题(\d+)\.\*\*\s*(.*)$/.exec(line);
  if (problem) {
    finishProblem();
    currentProblem = {
      number: Number(problem[1]),
      body: [problem[2].trim()],
    };
    continue;
  }

  if (currentProblem) currentProblem.body.push(line);
}
finishProblem();

const groupedProblems = [];
const byCategoryAndType = new Map();

for (const problem of problems) {
  const key = `${problem.category}::${problem.name}`;
  const existing = byCategoryAndType.get(key);
  if (!existing) {
    byCategoryAndType.set(key, problem);
    groupedProblems.push(problem);
    continue;
  }

  existing.variants.push({
    id: `${existing.id}-v${existing.variants.length + 1}`,
    name: `变式题${existing.variants.length + 1}`,
    mother_id: problem.mother_id,
    source: problem.source,
    stem: problem.stem,
    options: problem.options,
    answer: problem.answer,
    explanation: problem.explanation,
    tags: problem.tags,
  });
}

fs.writeFileSync(path.join(root, "data", "problems.json"), JSON.stringify(groupedProblems, null, 2) + "\n", "utf8");
console.log(`wrote ${groupedProblems.length} mother problems with ${problems.length - groupedProblems.length} variants`);
