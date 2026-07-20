import { AgilityPic } from "@agility/nextjs";

interface HeroHeadingProps {
  module: {
    contentID?: number;
    fields: {
      title: string;
      subTitle?: string;
      image?: any;
    };
  };
}

/* Ocean-tokenized section hero (was the solid purple band). */
export default function HeroHeading({ module }: HeroHeadingProps) {
  const { fields } = module;

  return (
    <div
      className="bg-(--bg) text-(--text) font-muli order-2 border-b border-(--border)"
      data-agility-component={module.contentID}
    >
      {/* Flush with the shell column — the template provides page padding. */}
      <div className="relative pt-8 pb-10">
        {fields.image && fields.image.url && (
          <AgilityPic image={fields.image} className="mb-8" fallbackWidth={100} data-agility-field="image" />
        )}
        <h1
          className="m-0"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1.9rem,4vw,2.8rem)",
            letterSpacing: "-.03em",
            lineHeight: 1.08,
            textWrap: "balance",
            color: "var(--text)",
          }}
          data-agility-field="title"
        >
          {fields.title}
        </h1>
        {fields.subTitle && (
          <p
            className="mt-4 max-w-[62ch] text-xl m-0"
            style={{ color: "var(--text-2)", lineHeight: 1.55 }}
            data-agility-field="subTitle"
          >
            {fields.subTitle}
          </p>
        )}
      </div>
    </div>
  );
}
