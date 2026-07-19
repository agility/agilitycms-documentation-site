import { renderHTML } from "@agility/nextjs";

const RawHTML = ({ id, html }: { id?: string; html: string }) => {
  return (
    <div
      className="mt-8 mb-8 text-(--text-2)"
      dangerouslySetInnerHTML={renderHTML(html)}
    />
  );
};

export default RawHTML;
