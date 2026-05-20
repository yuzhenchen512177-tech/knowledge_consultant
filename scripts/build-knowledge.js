const fs = require("fs");
const path = require("path");

const root = process.cwd();
const mdPath = path.join(root, "phase_0_document", "高中数学函数与导数知识点归纳.md");
const raw = fs.readFileSync(mdPath, "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/);

const legacyByName = new Map([
  ["函数", "func"],
  ["导数", "deriv"],
  ["函数的概念", "func.def"],
  ["函数的概念及其表示", "func.def"],
  ["求函数解析式常用方法", "func.analytic"],
  ["函数的单调性", "func.monotonic"],
  ["单调性", "func.monotonic"],
  ["函数的奇偶性", "func.odd_even"],
  ["奇偶性", "func.odd_even"],
  ["函数的表示法", "func.image"],
  ["分段函数", "func.piecewise"],
  ["幂函数", "func.power"],
  ["指数函数", "func.exp"],
  ["对数函数", "func.log"],
  ["三角函数", "func.trig"],
  ["函数的零点", "func.zero"],
  ["二分法", "func.zero.bisection"],
  ["导数的概念及其意义", "deriv.def"],
  ["瞬时变化率（导数）", "deriv.def.instant"],
  ["导数的几何意义", "deriv.tangent"],
  ["基本初等函数的导数公式", "deriv.basic.formulas"],
  ["导数的四则运算法则", "deriv.rules"],
  ["复合函数的导数（链式法则）", "deriv.chain"],
  ["函数的单调性与导数的关系", "deriv.monotonic"],
  ["函数的极值与最大（小）值", "deriv.extrema"],
  ["不等式恒成立问题", "deriv.optimization"],
]);

const fallbackSlugs = [
  "overview", "chapter", "section", "concept", "definition", "property",
  "method", "formula", "application", "model", "rule", "example",
];
const used = new Set();

function normalizeTitle(title) {
  return title
    .replace(/^第[一二三四五六七八九十]+部分\s*/, "")
    .replace(/^第[一二三四五六七八九十]+章\s*/, "")
    .replace(/^\d+(?:\.\d+)*\s*/, "")
    .replace(/^[一二三四五六七八九十]+、\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function cleanDisplayName(title) {
  return normalizeTitle(title)
    .replace(/^函数（必修第一册）$/, "函数")
    .replace(/^导数（选择性必修第二册）$/, "导数")
    .trim();
}

function toChineseOrdinal(num) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (num <= 10) return num === 10 ? "十" : digits[num];
  if (num < 20) return `十${digits[num - 10]}`;
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return `${digits[tens]}十${ones ? digits[ones] : ""}`;
}

function titleToken(title, index) {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii;
  return fallbackSlugs[index % fallbackSlugs.length] + index;
}

function uniqueId(base) {
  let id = base;
  let index = 2;
  while (used.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  used.add(id);
  return id;
}

function makeId(title, parent, index) {
  const normalized = normalizeTitle(title);
  const legacy = legacyByName.get(normalized) || legacyByName.get(title.trim());
  if (legacy && !used.has(legacy)) return uniqueId(legacy);
  const rootPrefix = parent?.id?.startsWith("deriv") ? "deriv" : "func";
  return uniqueId(`${parent ? parent.id : rootPrefix}.${titleToken(title, index)}`);
}

function chapterFor(stack, title) {
  const full = [...stack.map((n) => n.name), title].join(" / ");
  if (full.includes("第二部分 导数") || full.includes("一元函数的导数")) return "导数";
  if (full.includes("第一部分 函数") || full.includes("函数")) return "函数";
  return "高中数学";
}

function finish(node) {
  if (!node) return;
  node.content = node.rawContent.join("\n").trim();
  delete node.rawContent;
}

const nodes = [];
const stack = [];
let current = null;
let inSummary = false;
const rootIndex = new Map();

for (const line of lines) {
  const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (heading) {
    const level = heading[1].length;
    const title = heading[2].trim();
    if (level === 1 && title.includes("知识点归纳")) {
      current = null;
      continue;
    }
    if (title.includes("知识框架总结")) {
      inSummary = true;
      continue;
    }
    if (inSummary) continue;
    while (stack.length && stack[stack.length - 1].level >= level) finish(stack.pop());
    const parent = stack[stack.length - 1] || null;
    const id = title.includes("第一部分") && title.includes("函数")
      ? uniqueId("func")
      : title.includes("第二部分") && title.includes("导数")
        ? uniqueId("deriv")
        : makeId(title, parent, nodes.length);
    const node = {
      id,
      name: cleanDisplayName(title),
      raw_name: title,
      chapter: chapterFor(stack, title),
      parent_tag: parent ? parent.id : null,
      level,
      order: nodes.length,
      content: "",
      rawContent: [],
    };
    nodes.push(node);
    if (parent) parent.has_children = true;
    stack.push(node);
    current = node;
  } else if (!inSummary && current) {
    current.rawContent.push(line);
  }
}
while (stack.length) finish(stack.pop());

const byId = new Map(nodes.map((node) => [node.id, node]));
const childCounts = new Map();
const childrenByParent = new Map();
for (const node of nodes) {
  if (!node.parent_tag) continue;
  childCounts.set(node.parent_tag, (childCounts.get(node.parent_tag) || 0) + 1);
  if (!childrenByParent.has(node.parent_tag)) childrenByParent.set(node.parent_tag, []);
  childrenByParent.get(node.parent_tag).push(node);
}

function applyNumbering() {
  const roots = nodes
    .filter((node) => !node.parent_tag)
    .sort((a, b) => a.order - b.order);

  roots.forEach((root, index) => {
    const chapterNumber = index + 1;
    rootIndex.set(root.id, chapterNumber);
    root.number = `${chapterNumber}`;
    root.name = `第${toChineseOrdinal(chapterNumber)}章 ${cleanDisplayName(root.name)}`;
    numberChildren(root, `${chapterNumber}`);
  });
}

function numberChildren(parent, prefix) {
  const children = (childrenByParent.get(parent.id) || []).sort((a, b) => a.order - b.order);
  children.forEach((child, index) => {
    const number = `${prefix}.${index + 1}`;
    child.number = number;
    child.name = `${number} ${cleanDisplayName(child.name)}`;
    numberChildren(child, number);
  });
}

function addCompat(id, name, parent_tag, chapter, content) {
  if (byId.has(id)) return;
  const parent = byId.get(parent_tag);
  const node = {
    id,
    name,
    chapter,
    parent_tag,
    level: parent ? parent.level + 1 : 3,
    order: nodes.length,
    content,
    has_children: false,
    is_leaf: true,
    compat: true,
  };
  nodes.push(node);
  byId.set(id, node);
  childCounts.set(parent_tag, (childCounts.get(parent_tag) || 0) + 1);
}

addCompat(
  "func.domain",
  "定义域",
  "func.def",
  "函数",
  "定义域：自变量 x 的取值范围。求定义域时通常关注分母不为 0、偶次根式被开方数非负、对数真数大于 0、实际问题约束等条件。"
);
addCompat(
  "func.range",
  "值域",
  "func.def",
  "函数",
  "值域：函数值 y 的集合 {f(x) | x ∈ A}。值域是目标集合 B 的子集，常结合定义域、单调性、图象、配方法或换元法求解。"
);
addCompat(
  "func.composite",
  "复合函数",
  "func.def",
  "函数",
  "复合函数常写作 y = f(g(x))。判断复合函数单调性可用“同增异减”：内外层单调性相同则整体递增，相反则整体递减。"
);
addCompat(
  "func.quadratic",
  "二次函数",
  "func",
  "函数",
  "二次函数是重要函数模型，常用于求最值、值域、零点、图象对称轴及实际应用建模。"
);
addCompat(
  "func.inverse",
  "反函数",
  "func.log",
  "函数",
  "指数函数 y = a^x 与对数函数 y = log_a x 互为反函数，图象关于直线 y = x 对称。"
);
addCompat(
  "deriv.basic",
  "基本导数公式",
  "deriv",
  "导数",
  byId.get("deriv.basic.formulas")?.content || "基本初等函数的导数公式是导数运算的基础。"
);
addCompat(
  "deriv.tangent.equation",
  "切线方程",
  "deriv.tangent",
  "导数",
  "函数 y = f(x) 在 x0 处的导数 f′(x0) 是曲线在点 (x0, f(x0)) 处切线的斜率，切线方程为 y - f(x0) = f′(x0)(x - x0)。"
);

for (const node of nodes) {
  if (!childrenByParent.has(node.parent_tag)) {
    childrenByParent.set(node.parent_tag, []);
  }
}
childrenByParent.clear();
for (const node of nodes) {
  if (!node.parent_tag) continue;
  if (!childrenByParent.has(node.parent_tag)) childrenByParent.set(node.parent_tag, []);
  childrenByParent.get(node.parent_tag).push(node);
}
applyNumbering();

for (const node of nodes) {
  node.has_children = (childCounts.get(node.id) || 0) > 0;
  node.is_leaf = !node.has_children;
}

fs.writeFileSync(path.join(root, "data", "knowledge.json"), JSON.stringify(nodes, null, 2) + "\n", "utf8");
console.log(`wrote ${nodes.length} knowledge nodes`);
