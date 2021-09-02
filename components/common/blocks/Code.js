import React from "react";

const Code =  ({ id, code}) => {
    return (
        <code className="block whitespace-pre overflow-x-auto">
            {code}
        </code>
    );
};

export default Code;