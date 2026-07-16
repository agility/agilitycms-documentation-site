import Document, { Html, Head, Main, NextScript } from "next/document";



class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html className="h-full" lang="en-US" data-theme="light">
        <Head>
          {/* Apply the persisted theme before first paint so there is no flash
              of the wrong theme on reload. localStorage is correct here — this
              is the real app, not an artifact/preview build. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var m=localStorage.getItem('theme')||'system';var d=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;document.documentElement.setAttribute('data-theme',d);document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
            }}
          />
          {/* <link rel="stylesheet" href="/docs/css/highlight-js/lightfair.css" /> */}
          {/* <link
            rel="stylesheet"
            href="https://use.typekit.net/arl7bjd.css"
            as="style"
            crossOrigin="anonymous"
          />
          <link
            rel="stylesheet"
            crossOrigin="anonymous"
            href="https://use.typekit.net/arl7bjd.css"
            type="text/css"
            media="screen and (min-width: 1px)"
          /> */}
        </Head>
        <body className="">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
