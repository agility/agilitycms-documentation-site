import React from "react";

import { isPassthroughImage, isSvgImage } from "lib/docs/passthroughImage";
import { ARTICLE_IMAGE_SIZES, articleImageSrcset } from "lib/docs/imageSrcset";

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

  const { src, srcSet } = articleImageSrcset(url, file?.size?.width);

  //width-described srcset + sizes, so the browser accounts for screen density itself
  //(see lib/docs/imageSrcset.ts)
  return (
    <div>
      <img
        className="m-auto border"
        src={src}
        srcSet={srcSet}
        sizes={ARTICLE_IMAGE_SIZES}
        alt={caption}
        width={file?.size?.width}
        height={file?.size?.height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

export default Image;
