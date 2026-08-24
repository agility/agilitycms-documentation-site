import { AgilityPic } from "@agility/nextjs";
import Link from "next/link";

interface TextBlocksWithImagesProps {
  module: {
    fields: {
      link1: { href: string; text?: string };
      text1?: string;
      image1: any;
      link2: { href: string; text?: string };
      text2?: string;
      image2: any;
    };
  };
}

const TextBlocksWithImages = ({ module }: TextBlocksWithImagesProps) => {
  const { fields } = module;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div className="grid lg:grid-cols-4 lg:gap-x-8">
        <div className="col-span-2 bg-(--raised) md:ml-14 p-6 group mb-12 lg:mb-0">
          <Link href={fields.link1.href} className="font-bold grid md:grid-cols-2 relative md:-left-20">
            <div className="bg-(--surface) px-3 rounded-lg custom-shadow">
              <div className="flex space-x-[3px] py-2">
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
              </div>
              <AgilityPic
                image={fields.image1}
                fallbackWidth={300}
                className="pb-2 w-[300px] hidden lg:block"
              />
              <AgilityPic
                image={fields.image1}
                className="pb-2 w-full block lg:hidden"
              />
            </div>
            <div className="text-center md:text-left mt-8 md:mt-0 md:ml-10 w-full flex items-center justify-center">
              <div>
                <h4 className="text-(--text) text-lg mb-2 group-hover:text-(--primary-text)">
                  {fields.link1.text}
                </h4>
                <p className="text-(--text-2) font-normal">{fields.text1}</p>
              </div>
            </div>

          </Link>
        </div>
        <div className="col-span-2 bg-(--raised) md:ml-14 p-6 group mb-12 lg:mb-0">
          <Link href={fields.link2.href} className="font-bold grid md:grid-cols-2 relative md:-left-20">
            <div className="bg-(--surface) px-3 rounded-lg custom-shadow">
              <div className="flex space-x-[3px] py-2">
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-(--muted)" />
              </div>
              <AgilityPic
                image={fields.image2}
                fallbackWidth={300}
                className="pb-2 w-[300px] hidden lg:block"
              />
              <AgilityPic
                image={fields.image2}
                className="pb-2 w-full block lg:hidden"
              />

            </div>
            <div className="text-center md:text-left mt-8 md:mt-0 md:ml-10 w-full flex items-center justify-center">
              <div>
                <h4 className="text-(--text) text-lg mb-2 group-hover:text-(--primary-text)">
                  {fields.link2.text}
                </h4>
                <p className="text-(--text-2) font-normal">{fields.text2}</p>
              </div>
            </div>

          </Link>
        </div>
      </div>
    </div>
  );
};

export default TextBlocksWithImages;
