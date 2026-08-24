import hljs from "highlight.js";

// Classic-content code blocks carry no language hint, so we auto-detect — but
// CONSTRAINED to the languages our docs actually use. Unbounded detection
// misfires badly (it classified a JSON response as Smalltalk, turning every
// string into an italic "comment"). The subset keeps detection sane.
const AUTO_SUBSET = [
  "json", "javascript", "typescript", "bash", "shell",
  "xml", "html", "css", "scss", "graphql", "yaml",
  "python", "csharp", "go", "php", "sql",
];

const Code = ({ id, code }: { id?: string; code: string }) => {
  let html = "";
  try {
    html = hljs.highlightAuto(code || "", AUTO_SUBSET).value;
  } catch {
    html = "";
  }

  // The visible panel (bg + border + radius + scroll) lives on the wrapper so
  // it's independent of the dark-mode `.hljs { background: transparent }` remap.
  return (
    <div className="my-8 overflow-x-auto rounded-(--r-md) border border-(--border-strong) bg-(--code-bg)">
      <pre className="m-0 p-5">
        {html ? (
          <code
            className="hljs block bg-transparent text-(--text)"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <code className="hljs block bg-transparent text-(--text)">{code}</code>
        )}
      </pre>
    </div>
  );
};

export default Code;
