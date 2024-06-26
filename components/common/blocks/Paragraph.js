import React from "react";
import { renderHTML } from "../../../utils/htmlUtils";

const Paragraph = ({ id, text }) => {


  return (
    <p
      key={id}
      dangerouslySetInnerHTML={renderHTML(text)}
      className="text-darkestGray"
    />
  );
};

export default Paragraph;
