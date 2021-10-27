import React from "react";

//TODO: implement Next IMG
const Image = ({
  id,
  caption,
  file,
  stretched,
  withBackground,
  withBorder,
}) => {
  const url = file.url;
  const size = file.size;
  return (
    <div>
      <img className="m-auto border" src={file.url} alt={caption} />
    </div>
  );
};

export default Image;
