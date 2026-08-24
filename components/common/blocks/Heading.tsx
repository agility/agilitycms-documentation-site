import React from "react";

const Heading =  ({ id, text, level}: { id?: string; text: string; level: number }) => {
    const HTag: any = `h${level}`;
    return (
            <HTag id={id}>{text}</HTag>
    );
};

export default Heading;