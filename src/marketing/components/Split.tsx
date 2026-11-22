import { Fragment } from "react";

/**
 * Splits a text into masked words (`.rn-w > span`) for the rising-words
 * animation. Rendered on the server, so there is no layout shift and screen
 * readers read the plain sentence (spaces are real text nodes).
 */
export function Split({ text, offset = 0 }: { text: string; offset?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="rn-w">
            <span style={{ "--i": i + offset } as React.CSSProperties}>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
