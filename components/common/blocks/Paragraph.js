import React from "react";
import { renderHTML } from "@agility/nextjs";

const Paragraph = ({ id, text}) => {
    
    return (
        <div className="prose">
            <p dangerouslySetInnerHTML={renderHTML(text)} />
        </div>
    );
};

export default Paragraph;
