import React from "react";
import { renderHTML } from "../../../utils/htmlUtils";

const Paragraph = ({ id, text }: { id?: string; text: string }) => {


  return (
    <p
      key={id}
      dangerouslySetInnerHTML={renderHTML(text)}
      className="text-(--text-2)"
    />
  );
};

export default Paragraph;
