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
  return (
    <Head>
      <title>{title} | Agility CMS Docs</title>
      {(process.env.ROBOTS_NO_INDEX || noIndex) && (
        <meta name="robots" content="noindex"></meta>
      )}
      <meta name="generator" content="Agility CMS" />
      <meta name="agility_timestamp" content={new Date().toLocaleString()} />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {additionalHeaderMarkup}
    </Head>
  );
};

export default HeadSEO;
