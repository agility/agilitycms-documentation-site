import React from "react";

const Embed =  ({ id, embed, source, service, height, width, caption }) => {

    return (
        <div className="aspect-w-16 aspect-h-9 mt-8 mb-8">
            <iframe src={embed} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
    );
};

export default Embed;