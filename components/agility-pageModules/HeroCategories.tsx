/* Ocean-tokenized hub hero + category cards (was the purple band + white
   overlapping cards). Kept the same fields/structure — only the skin changed. */
import {
  LibraryIcon,
  PencilAltIcon,
  TerminalIcon,
  ShieldCheckIcon,
} from "@heroicons/react/outline";
import Link from "next/link";

const icons = {
  LibraryIcon,
  PencilAltIcon,
  TerminalIcon,
  ShieldCheckIcon,
};

interface HeroCategoriesProps {
  module: {
    fields: {
      title: string;
      subTitle?: string;
      // expanded category items: { fields: { title, subTitle, icon, landingPage } }
      categories: any[];
    };
  };
}

// Rotate the ocean accents across the four category cards (per-card bar +
// AA-safe ink, same pattern as FeatureCardGroup / globals.css).
const accents = ["primary", "secondary", "tertiary", "primary"];

export default function HeroCategories({ module }: HeroCategoriesProps) {
  const { fields } = module;

  const supportLinks = fields.categories.map((cat, idx) => {
    return {
      name: cat.fields.title,
      href: cat.fields.landingPage.href,
      icon: icons[cat.fields.icon],
      description: cat.fields.subTitle,
      accent: accents[idx % accents.length],
    };
  });

  return (
    <div className="bg-(--bg) text-(--text) font-muli">
      {/* Header */}
      <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-10 sm:px-6 lg:px-8">
        <h1
          className="text-center m-0"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(2.1rem,4.6vw,3.1rem)",
            letterSpacing: "-.03em",
            lineHeight: 1.04,
            textWrap: "balance",
            color: "var(--text)",
          }}
        >
          {fields.title}
        </h1>
        <p className="text-center mt-6 text-lg" style={{ color: "var(--text-2)" }}>
          {fields.subTitle}
        </p>
      </div>

      {/* Category cards */}
      <section className="max-w-7xl mx-auto relative z-10 pb-14 px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">{fields.title}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {supportLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`ocean-card-${link.accent} relative flex flex-col overflow-hidden p-6 pb-5 transition-transform hover:-translate-y-[3px] group`}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--elev-1)",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: "var(--tcbar)" }}
              />
              {link.icon && (
                <span
                  className="grid place-items-center w-[38px] h-[38px] mb-3.5"
                  style={{
                    borderRadius: "var(--r-sm)",
                    background: "color-mix(in srgb, var(--tcbar) 15%, transparent)",
                    color: "var(--tcink)",
                  }}
                >
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <h3
                className="m-0 mb-1.5"
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "1.25rem",
                  letterSpacing: "-.01em",
                  color: "var(--text)",
                }}
              >
                {link.name}
              </h3>
              <p className="m-0" style={{ color: "var(--text-2)", fontSize: ".9rem", lineHeight: 1.55 }}>
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
