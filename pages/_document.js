import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html className="h-full">
        <Head>
            {process.env.ROBOTS_NO_INDEX &&
              <meta name="robots" content="noindex"></meta>
            }
            {/* <script dangerouslySetInnerHTML={{ __html: nightwind.init() }} /> */}
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            <link rel="stylesheet" href="/docs/css/highlight-js/lightfair.css" />
        </Head>
        <body className="overflow-hidden h-full">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument