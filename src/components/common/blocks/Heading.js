import React from "react";

const Heading =  ({ id, text, level}) => {
    const HTag = `h${level}`;
    return (
            <HTag id={id}>{text}</HTag>
    );
};

export default Heading;