import { ExclamationIcon } from "@heroicons/react/solid";
import { renderHTML } from "@agility/nextjs";

// Ocean caution callout — same recipe as the CalloutBlock component so
// article warnings and composed callouts look identical in both themes.
const Warning = ({ id, title, message }: { id?: string; title?: string; message?: string }) => {
  return (
    <div
      className="p-4 mt-8 mb-8"
      style={{
        background: "color-mix(in srgb, var(--warn) 10%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--warn) 40%, transparent)",
        borderRadius: "var(--r-md)",
      }}
    >
      <div className="flex">
        <div className="shrink-0">
          <ExclamationIcon
            className="h-5 w-5 text-(--warn)"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-(--text)">{title}</h3>
          <div className="mt-2 text-sm text-(--text-2)">
            <p dangerouslySetInnerHTML={renderHTML(message)}></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warning;
