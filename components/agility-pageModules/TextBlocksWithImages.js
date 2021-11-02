import Link from "next/link";

const TextBlocksWithImages = ({ module }) => {
  const { fields } = module;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div className="grid lg:grid-cols-4 lg:gap-x-8">
        <div className="col-span-2 bg-lightGray md:ml-14 p-6 group mb-12 lg:mb-0">
          <Link href={fields.link1.href}>
            <a className="font-bold grid md:grid-cols-2 relative md:-left-20">
              <div className="bg-white px-3 rounded-lg custom-shadow">
                <div className="flex space-x-[3px] py-2">
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                </div>
                <img
                  alt={fields.image1.label}
                  src={fields.image1.url}
                  className="pb-2 w-[300px] hidden lg:block"
                />
                <img
                  alt={fields.image1.label}
                  src={fields.image1.url}
                  className="pb-2 w-full block lg:hidden"
                />
              </div>
              <div className="text-center md:text-left mt-8 md:mt-0 md:ml-10 w-full flex items-center justify-center">
                <div>
                  <h4 className="text-darkestGray text-lg mb-2 group-hover:text-brightPurple">
                    {fields.link1.text}
                  </h4>
                  <p className="text-darkGray font-normal">{fields.text1}</p>
                </div>
              </div>
            </a>
          </Link>
        </div>
        <div className="col-span-2 bg-lightGray md:ml-14 p-6 group mb-12 lg:mb-0">
          <Link href={fields.link2.href}>
            <a className="font-bold grid md:grid-cols-2 relative md:-left-20">
              <div className="bg-white px-3 rounded-lg custom-shadow">
                <div className="flex space-x-[3px] py-2">
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                  <span className="inline-block w-[4px] h-[4px] rounded-full bg-darkerGray" />
                </div>
                <img
                  alt={fields.image2.label}
                  src={fields.image2.url}
                  className="pb-2 w-[300px] hidden lg:block"
                />
                <img
                  alt={fields.image2.label}
                  src={fields.image2.url}
                  className="pb-2 w-full block lg:hidden"
                />
              </div>
              <div className="text-center md:text-left mt-8 md:mt-0 md:ml-10 w-full flex items-center justify-center">
                <div>
                  <h4 className="text-darkestGray text-lg mb-2 group-hover:text-brightPurple">
                    {fields.link2.text}
                  </h4>
                  <p className="text-darkGray font-normal">{fields.text2}</p>
                </div>
              </div>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TextBlocksWithImages;
