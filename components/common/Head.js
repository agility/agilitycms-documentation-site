import React from "react";
import Head from "next/head";
import ReactHtmlParser from "react-html-parser";
//import nightwind from 'nightwind/helper'

export default ({ title, description, keywords, ogImage, metaHTML }) => {
  // setup and parse additional header markup
  let additionalHeaderMarkup = null;
  if (metaHTML) {
    additionalHeaderMarkup = ReactHtmlParser(metaHTML);
  }
  return (
    <Head>
      <title>{title} | Agility CMS Docs</title>
      <meta name="generator" content="Agility CMS" />
      <meta name="agility_timestamp" content={new Date().toLocaleString()} />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
        rel="stylesheet"
      />
      {process.env.ROBOTS_NO_INDEX &&
        <meta name="robots" content="noindex"></meta>
      }
      {/* <script dangerouslySetInnerHTML={{ __html: nightwind.init() }} /> */}
      {/* Start of agilitycms Zendesk Widget script */}
      <script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=75a855ec-8bb9-4017-a4d7-ebf0e3d7c77a"> </script>
      {/* End of agilitycms Zendesk Widget script */}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {additionalHeaderMarkup}
    </Head>
  );
};
