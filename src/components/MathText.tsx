"use client";

import { Fragment } from "react";
import { BlockMath, InlineMath } from "react-katex";

type Segment =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string };

function tokenize(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: content.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      segments.push({ type: "block", value: m[1].trim() });
    } else {
      segments.push({ type: "inline", value: m[2].trim() });
    }
    last = re.lastIndex;
  }
  if (last < content.length) {
    segments.push({ type: "text", value: content.slice(last) });
  }
  return segments;
}

function TextWithBreaks({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

export default function MathText({
  content,
  className,
  inline = true,
}: {
  content: string;
  className?: string;
  inline?: boolean;
}) {
  if (!content) return null;
  const segments = tokenize(content);
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={className}>
      {segments.map((s, i) => {
        if (s.type === "inline") {
          return <InlineMath key={i} math={s.value} />;
        }
        if (s.type === "block") {
          return <BlockMath key={i} math={s.value} />;
        }
        return <TextWithBreaks key={i} value={s.value} />;
      })}
    </Wrapper>
  );
}
