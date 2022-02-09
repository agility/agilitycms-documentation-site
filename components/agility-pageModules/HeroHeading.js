/* This example requires Tailwind CSS v2.0+ */
export default function HeroHeading({ module }) {
  const { fields } = module;

  return (
    <div className="bg-purple font-muli order-2">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0"></div>
        <div className="relative mx-auto py-10 px-4 sm:px-6 lg:px-8">
          {fields.image && fields.image.url && (
            <img className="mx-auto mb-8" alt={fields.image.label} src={fields.image.url + "?w=100"} />
          )}
          <h1 className="sm:text-center md:text-left text-3xl font-semibold tracking-normal text-white md:text-5xl">
            {fields.title}
          </h1>
          <p className="sm:text-center md:text-left mt-6 text-xl text-white">
            {fields.subTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
