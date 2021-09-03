import React from "react";
import { renderHTML } from "@agility/nextjs";

const Paragraph = ({ id, text}) => {
    
    return (
            <p dangerouslySetInnerHTML={renderHTML(text)} />
    );
};

export default Paragraph;
