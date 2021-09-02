import React from "react";

const Heading =  ({ id, text, level}) => {
    const HTag = `h${level}`;
    return (
        <div className="prose">
            <HTag name={id}>{text}</HTag>
        </div>
    );
};

export default Heading;