import React from "react";

import { isPassthroughImage, isSvgImage } from "lib/docs/passthroughImage";

//TODO: implement Next IMG
const Image = ({
  id,
  caption,
  file,
  stretched,
  withBackground,
  withBorder,
}: any) => {


  if (isPassthroughImage(file.url)) {
    //special case: gifs are not supported by the image service, and svgs get rasterized to a
    //broken png (see lib/docs/passthroughImage.ts)
    if (isSvgImage(file.url)) {
      //diagrams draw their own frame, so an SVG only gets a border when the editor asked
      //for one. Raster screenshots keep the unconditional border they have always had.
      return (<div>
        <img
          className={withBorder ? "m-auto border" : "m-auto"}
          src={file.url}
          alt={caption}
          width={file?.size?.width}
          height={file?.size?.height}
          loading="lazy"
          decoding="async"
        />
      </div>)
    }
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
