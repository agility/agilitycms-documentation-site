/* This example requires Tailwind CSS v2.0+ */
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

export default function HeroCategories({ module }) {
  const { fields } = module;

  const supportLinks = fields.categories.map((cat) => {
    return {
      name: cat.fields.title,
      href: cat.fields.landingPage.href,
      icon: icons[cat.fields.icon],
      description: cat.fields.subTitle,
    };
  });
  return (
    <div className="bg-lightPurple mb-56 font-muli">
      {/* Header */}
      <div className="relative bg-gray-100 bg-lightPurple">
        {/* <div className="absolute inset-0"></div> */}
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <h1 className="text-center font-normal tracking-normal text-white text-3xl md:text-5xl">
            {fields.title}
          </h1>
          <p className="text-center mt-6 text-lg text-white">
            {fields.subTitle}
          </p>
        </div>
      </div>

      {/* Overlapping cards */}
      <section
        className="-mt-36 mb-10 max-w-7xl mx-auto relative z-10 pb-14 px-4 sm:px-6 lg:px-8 top-40"

      >
        <h2 className="sr-only text">
          {fields.title}
        </h2>
        <div className="grid grid-cols-1 gap-y-20 lg:grid-cols-4 lg:gap-y-0 lg:gap-x-8">
          {supportLinks.map((link) => (
            <div
              key={link.name}
              className="flex flex-col bg-white custom-shadow group"
            >
              <Link href={link.href}>

                <div className="flex-1 relative pt-16 pb-8 px-8">
                  <div className="absolute top-0 p-5 inline-block bg-offwhite group-hover:bg-gray-200 transition duration-150 ease-in-out rounded-full transform -translate-y-1/2">
                    <link.icon
                      className="h-6 w-6 text-brightPurple"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-2xl font-medium text-darkerGray tracking-normal">
                    {link.name}
                  </h3>
                  <p className="mt-1 text-base text-darkGray">
                    {link.description}
                  </p>
                </div>

              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
