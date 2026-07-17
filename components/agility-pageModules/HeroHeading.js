import { AgilityPic } from "@agility/nextjs";

/* Ocean-tokenized section hero (was the solid purple band). */
export default function HeroHeading({ module }) {
  const { fields } = module;

  return (
    <div className="bg-(--bg) text-(--text) font-muli order-2 border-b border-(--border)">
      <div className="relative mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {fields.image && fields.image.url && (
          <AgilityPic image={fields.image} className="mx-auto mb-8" fallbackWidth={100} />
        )}
        <h1
          className="sm:text-center md:text-left m-0"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1.9rem,4vw,2.8rem)",
            letterSpacing: "-.03em",
            lineHeight: 1.08,
            textWrap: "balance",
            color: "var(--text)",
          }}
        >
          {fields.title}
        </h1>
        {fields.subTitle && (
          <p
            className="sm:text-center md:text-left mt-4 max-w-[62ch] text-xl m-0"
            style={{ color: "var(--text-2)", lineHeight: 1.55 }}
          >
            {fields.subTitle}
          </p>
        )}
      </div>
    </div>
  );
}
