"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import MathText from "@/components/MathText";

export interface KnowledgeItem {
  id: string;
  name: string;
  chapter: string;
  parent_tag: string | null;
  level?: number;
  order?: number;
  content?: string;
  has_children?: boolean;
  is_leaf?: boolean;
}

interface TreeNode extends KnowledgeItem {
  children: TreeNode[];
}

function buildTree(items: KnowledgeItem[]) {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const item of sorted) {
    byId.set(item.id, { ...item, children: [] });
  }

  for (const node of Array.from(byId.values())) {
    if (node.parent_tag && byId.has(node.parent_tag)) {
      byId.get(node.parent_tag)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { roots, byId };
}

function stripMarkdown(line: string) {
  return line
    .replace(/^>\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const lines = content.split("\n");
    const result: { type: "paragraph" | "quote" | "list" | "table" | "math"; lines: string[] }[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      if (line.trim() === "$$") {
        const math: string[] = [];
        index += 1;
        while (index < lines.length && lines[index].trim() !== "$$") {
          math.push(lines[index]);
          index += 1;
        }
        index += 1; // skip closing $$
        result.push({ type: "math", lines: math });
        continue;
      }

      if (line.trim().startsWith("|")) {
        const table: string[] = [];
        while (index < lines.length && lines[index].trim().startsWith("|")) {
          if (!/^\|\s*-+/.test(lines[index].trim())) table.push(lines[index]);
          index += 1;
        }
        result.push({ type: "table", lines: table });
        continue;
      }

      if (line.trim().startsWith(">")) {
        const quote: string[] = [];
        while (index < lines.length && lines[index].trim().startsWith(">")) {
          quote.push(stripMarkdown(lines[index]));
          index += 1;
        }
        result.push({ type: "quote", lines: quote });
        continue;
      }

      if (/^\s*(-|\*)\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        const list: string[] = [];
        while (
          index < lines.length &&
          (/^\s*(-|\*)\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]))
        ) {
          list.push(stripMarkdown(lines[index]));
          index += 1;
        }
        result.push({ type: "list", lines: list });
        continue;
      }

      const paragraph: string[] = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        !lines[index].trim().startsWith("|") &&
        !lines[index].trim().startsWith(">") &&
        !/^\s*(-|\*)\s+/.test(lines[index]) &&
        !/^\s*\d+\.\s+/.test(lines[index])
      ) {
        paragraph.push(stripMarkdown(lines[index]));
        index += 1;
      }
      result.push({ type: "paragraph", lines: paragraph });
    }

    return result;
  }, [content]);

  if (!content.trim()) {
    return <p className="text-sm text-gray-400">该节点用于分组，请继续展开下一级知识点。</p>;
  }

  return (
    <div className="space-y-4 text-sm leading-7 text-gray-700">
      {blocks.map((block, index) => {
        if (block.type === "math") {
          const math = block.lines.join("\n").trim();
          return math ? <BlockMath key={index} math={math} /> : null;
        }

        if (block.type === "quote") {
          return (
            <div key={index} className="border-l-4 border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-900 rounded-r-lg">
              {block.lines.map((line, i) => (
                <MathText key={i} content={line} inline={false} />
              ))}
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc pl-5 space-y-1">
              {block.lines.map((line, i) => (
                <li key={i}>
                  <MathText content={line} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          const rows = block.lines.map((line) =>
            line
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim())
          );
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-50 font-medium text-gray-800" : "bg-white"}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 align-top">
                          <MathText content={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div key={index} className="space-y-2">
            {block.lines.map((line, i) => (
              <MathText key={i} content={line} inline={false} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TreeBranch({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => (hasChildren ? onToggle(node.id) : onSelect(node))}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-950"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] ${
          hasChildren ? "bg-gray-100 text-gray-500" : "bg-transparent text-gray-300"
        }`}>
          {hasChildren ? (isOpen ? "−" : "+") : "•"}
        </span>
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {!hasChildren && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">内容</span>
        )}
      </button>

      {hasChildren && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeTree({ knowledge }: { knowledge: KnowledgeItem[] }) {
  const { roots, byId } = useMemo(() => buildTree(knowledge), [knowledge]);
  const parentById = useMemo(() => {
    const parents = new Map<string, string | null>();
    for (const item of knowledge) parents.set(item.id, item.parent_tag);
    return parents;
  }, [knowledge]);
  const firstLeaf = useMemo(() => {
    const walk = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.children.length === 0) return node;
        const leaf = walk(node.children);
        if (leaf) return leaf;
      }
      return null;
    };
    return walk(roots);
  }, [roots]);
  const [selected, setSelected] = useState<TreeNode | null>(firstLeaf);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    const openTop = (nodes: TreeNode[], depth = 0) => {
      for (const node of nodes) {
        if (depth < 2 && node.children.length > 0) ids.add(node.id);
        if (depth < 2) openTop(node.children, depth + 1);
      }
    };
    openTop(roots);
    return ids;
  });

  const selectedNode = selected ?? firstLeaf;

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    function selectFromHash() {
      const hash = decodeURIComponent(window.location.hash.replace(/^#knowledge-/, ""));
      if (!hash || !byId.has(hash)) return;
      const node = byId.get(hash)!;
      setSelected(node);
      setExpanded((current) => {
        const next = new Set(current);
        let parent = parentById.get(hash);
        while (parent) {
          next.add(parent);
          parent = parentById.get(parent) ?? null;
        }
        return next;
      });
      window.setTimeout(() => {
        document.getElementById(`knowledge-${hash}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }

    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [byId, parentById]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">知识点树</h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {knowledge.length} 个节点
          </span>
        </div>
        <div className="max-h-[620px] space-y-0.5 overflow-auto pr-1">
          {roots.map((root) => (
            <TreeBranch
              key={root.id}
              node={root}
              depth={0}
              selectedId={selectedNode?.id ?? null}
              expanded={expanded}
              onToggle={toggle}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      <div id={selectedNode ? `knowledge-${selectedNode.id}` : undefined} className="rounded-xl border border-gray-200 bg-white p-5 scroll-mt-24">
        {selectedNode ? (
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <p className="mb-1 text-xs font-medium text-gray-400">{selectedNode.chapter} / {selectedNode.id}</p>
              <h3 className="text-xl font-semibold text-gray-900">{selectedNode.name}</h3>
            </div>
            <MarkdownContent content={selectedNode.content ?? ""} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">请选择左侧末端知识点查看内容。</p>
        )}
      </div>
    </div>
  );
}
