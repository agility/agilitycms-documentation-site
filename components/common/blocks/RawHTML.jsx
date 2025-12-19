import { renderHTML } from "@agility/nextjs";

const RawHTML = ({ id, html }) => {
  return (
    <div
      className="mt-8 mb-8 text-darkestGray"
      dangerouslySetInnerHTML={renderHTML(html)}
    />
  );
};

export default RawHTML;
