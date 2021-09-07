import Document, { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

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
            {/* Start of agilitycms Zendesk Widget script */}
            <Script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=75a855ec-8bb9-4017-a4d7-ebf0e3d7c77a"> </Script>
            {/* End of agilitycms Zendesk Widget script */}
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
                rel="stylesheet"
            />
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