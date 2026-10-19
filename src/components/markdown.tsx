import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/** Turns "Q3" mentions into links to that question, when it exists. */
function linkQuestions(text: string, questionKeys?: Set<string>) {
  if (!questionKeys?.size) return text;
  return text.replace(/(?<![[\w#/-])Q(\d+)\b(?!\])/g, (match, n) =>
    questionKeys.has(match) ? `[${match}](#q-${n})` : match,
  );
}

// Raw HTML in the Markdown is ignored (react-markdown's default), so imported
// files cannot inject scripts.
export function Markdown({ text, questionKeys }: { text: string; questionKeys?: Set<string> }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        // Single line breaks are kept, as AI-written documents often rely on them.
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("#") ? (
              <a href={href}>{children}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {linkQuestions(text, questionKeys)}
      </ReactMarkdown>
    </div>
  );
}
