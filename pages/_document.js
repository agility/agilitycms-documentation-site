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
          
            {/* Start of agilitycms Zendesk Widget script */}
            <Script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=75a855ec-8bb9-4017-a4d7-ebf0e3d7c77a"> </Script>
            {/* End of agilitycms Zendesk Widget script */}
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            {/* <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
                rel="stylesheet"
            /> */}
            {/* <link rel="stylesheet" href="https://use.typekit.net/af/7fe570/00000000000000007735a0ee/30/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n4&v=3" as="font" crossOrigin="anonymous" />
            <link rel="stylesheet" href="https://use.typekit.net/arl7bjd.css" as="style" crossOrigin="anonymous"/>
            <link rel="stylesheet" crossOrigin="anonymous" href="https://use.typekit.net/arl7bjd.css" type='text/css' media="screen and (min-width: 1px)" /> */}
            <link
              href="https://fonts.googleapis.com/css?family=Muli:300,400,600&display=swap"
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