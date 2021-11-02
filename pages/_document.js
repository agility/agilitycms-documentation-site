import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html className="h-full" lang="en-US">
        <Head>
          <link
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
          />
        </Head>
        <body className="overflow-hidden h-full">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
