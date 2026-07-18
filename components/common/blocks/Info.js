import { InformationCircleIcon } from "@heroicons/react/solid";
import { renderHTML } from "@agility/nextjs";

// Ocean note callout — same recipe as the CalloutBlock component so
// article info blocks and composed callouts look identical in both themes.
const Quote = ({ id, text, caption }) => {
  return (
    <div
      className="p-4 mt-8 mb-8"
      style={{
        background: "color-mix(in srgb, var(--info) 10%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--info) 40%, transparent)",
        borderRadius: "var(--r-md)",
      }}
    >
      <div className="flex">
        <div className="shrink-0">
          <InformationCircleIcon
            className="h-5 w-5 text-(--info)"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p
            className="text-sm text-(--text-2)"
            dangerouslySetInnerHTML={renderHTML(text)}
          ></p>
        </div>
      </div>
    </div>
  );
};

export default Quote;
