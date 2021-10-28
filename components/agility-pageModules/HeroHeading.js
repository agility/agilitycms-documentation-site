/* This example requires Tailwind CSS v2.0+ */
export default function HeroHeading({ module }) {
  const { fields } = module;

  return (
    <div className="bg-white font-muli">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0"></div>
        <div className="relative max-w-7xl mx-auto pt-24 px-4 sm:px-6 lg:px-8">
          {fields.image && fields.image.url && (
            <img className="mx-auto mb-8" src={fields.image.url + "?w=100"} />
          )}
          <h1 className="text-center text-4xl font-semibold tracking-normal text-gray-900 md:text-5xl lg:text-6xl">
            {fields.title}
          </h1>
          <p className="text-center mt-6 text-xl text-gray-700">
            {fields.subTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
