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


  if (file.url.endsWith(".gif")) {
    //special case since gifs are not supported by the image service (TODO:once we switch to fastly io we can remove this)
    return (<div>
      <img className="m-auto border" src={file.url} alt={caption} />
    </div>)
  }

  let url = file.url.replaceAll(" ", "%20");
  if (url.indexOf("?format=auto") === -1) {
    url = url + "?format=auto";
  }

  let size = file?.size || {};
  const imageWidth = size?.width || 800

  //calculate the srcsets for differnet screen sizes and resolutions
  const src2400 = `${url}&w=2000`;
  const src1600 = `${url}&w=1600`;
  const src1200 = `${url}&w=1200`;
  const src800 = `${url}&w=800`;
  const src600 = `${url}&w=600`;
  const src400 = `${url}&w=400`;

  return (
    <div>
      <picture>

        {imageWidth >= 2400 &&
          <source srcSet={src2400} media="(min-width: 1200px) and (min-resolution: 2x)" />
        }

        {imageWidth >= 1600 &&
          <source srcSet={src1600} media="(min-width: 800px) and (min-resolution: 2x)" />
        }

        {imageWidth >= 1200 && (
          <>
            <source srcSet={src1200} media="(min-width: 1200px)" />
            <source srcSet={src1200} media="(min-width: 600px) and (min-resolution: 2x)" />
          </>
        )
        }
        {imageWidth >= 800 && <>
          <source srcSet={src800} media="(min-width: 800px)" />
          <source srcSet={src800} media="(min-width: 400px) and (min-resolution: 2x)" />
        </>
        }
        {imageWidth >= 600 &&
          <source srcSet={src600} media="(min-width: 600px)" />
        }
        <img className="m-auto border" src={src400} alt={caption} />
      </picture>
    </div>
  );
};

export default Image;
