import React from "react";

const Code =  ({ id, code}) => {
    return (
        <code className="block whitespace-pre overflow-x-auto mb-8 mt-8">
            {code}
        </code>
    );
};

export default Code;