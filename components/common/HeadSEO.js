import React from "react";
import Head from "next/head";
import ReactHtmlParser from "react-html-parser";
//import nightwind from 'nightwind/helper'

const HeadSEO = ({ title, description, keywords, ogImage, metaHTML, noIndex }) => {
  // setup and parse additional header markup
  let additionalHeaderMarkup = null;
  if (metaHTML) {
    additionalHeaderMarkup = ReactHtmlParser(metaHTML);
  }

  const createSharingImage = ({ cloudName, text }) => {
    const imageTransformations = [
      'w_1600',
      'h_900',
      'c_fill',
      'q_auto',
      'f_auto'
    ].join(',')
    const textTransformations = [
      'w_1400',
      'c_fit',
      'g_center',
      'co_white',
      `l_text:muli_96_center:${encodeURIComponent(text)}`
    ].join(',')

    const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/`
    return `${baseUrl}${imageTransformations}/${textTransformations}/docs/agility-og-docs.png`
  }

  let theOgImage = ogImage
  if (!theOgImage) {
    theOgImage = createSharingImage({
      cloudName: "agility-cms",
      text: title
    })
  }

  return (
    <Head>
      <title>{title} | Agility Docs</title>
      {(process.env.ROBOTS_NO_INDEX || noIndex) && (
        <meta name="robots" content="noindex"></meta>
      )}
      <meta name="generator" content="Agility CMS" />
      <meta name="agility_timestamp" content={new Date().toLocaleString()} />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {theOgImage && <meta property="og:image" content={theOgImage} />}
      {additionalHeaderMarkup}
    </Head>
  );
};

export default HeadSEO;
