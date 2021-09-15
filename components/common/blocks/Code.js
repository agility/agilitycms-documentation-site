import React from "react";

const Code =  ({ id, code}) => {
    return (
        <pre>
            <code className="block rounded-lg bg-gray-100 text-gray-700 px-5 py-5 whitespace-pre overflow-x-auto mb-8 mt-8">
                {code}
            </code>
        </pre>
    );
};

export default Code;