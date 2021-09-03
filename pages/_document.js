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
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
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