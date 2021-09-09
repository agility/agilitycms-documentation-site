import { normalizeListedArticles } from "utils/linkUtils"
import Link from 'next/link'

/* This example requires Tailwind CSS v2.0+ */
// const posts = [
//     {
//       title: 'Boost your conversion rate',
//       href: '#',
//       category: { name: 'Article', href: '#' },
//       description:
//         'Lorem ipsum dolor sit amet consectetur adipisicing elit. Architecto accusantium praesentium eius, ut atque fuga culpa, similique sequi cum eos quis dolorum.',
//       date: 'Mar 16, 2020',
//       datetime: '2020-03-16',
//       imageUrl:
//         'https://images.unsplash.com/photo-1496128858413-b36217c2ce36?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1679&q=80',
//       readingTime: '6 min',
//       author: {
//         name: 'Roel Aufderehar',
//         href: '#',
//         imageUrl:
//           'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//       },
//     },
//     {
//       title: 'How to use search engine optimization to drive sales',
//       href: '#',
//       category: { name: 'Video', href: '#' },
//       description:
//         'Lorem ipsum dolor sit amet consectetur adipisicing elit. Velit facilis asperiores porro quaerat doloribus, eveniet dolore. Adipisci tempora aut inventore optio animi., tempore temporibus quo laudantium.',
//       date: 'Mar 10, 2020',
//       datetime: '2020-03-10',
//       imageUrl:
//         'https://images.unsplash.com/photo-1547586696-ea22b4d4235d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1679&q=80',
//       readingTime: '4 min',
//       author: {
//         name: 'Brenna Goyette',
//         href: '#',
//         imageUrl:
//           'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//       },
//     },
//     {
//       title: 'Improve your customer experience',
//       href: '#',
//       category: { name: 'Case Study', href: '#' },
//       description:
//         'Lorem ipsum dolor sit amet consectetur adipisicing elit. Sint harum rerum voluptatem quo recusandae magni placeat saepe molestiae, sed excepturi cumque corporis perferendis hic.',
//       date: 'Feb 12, 2020',
//       datetime: '2020-02-12',
//       imageUrl:
//         'https://images.unsplash.com/photo-1492724441997-5dc865305da7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1679&q=80',
//       readingTime: '11 min',
//       author: {
//         name: 'Daniela Metz',
//         href: '#',
//         imageUrl:
//           'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
//       },
//     },
//   ]
  
const ArticleListing = ({ module, customData }) => {
    const { articles } = customData;
    const { fields } = module;
    return (
        <div className="relative my-20 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0">
                <div className="bg-white h-1/3 sm:h-2/3" />
            </div>
            <div className="relative max-w-7xl mx-auto">
                <div className="text-center">
                <h2 className="text-3xl tracking-tight font-extrabold text-gray-900 sm:text-4xl">{fields.title}</h2>
                </div>
                <div className="mt-12 max-w-lg mx-auto grid gap-5 lg:grid-cols-4 lg:max-w-none">
                {articles.map((article) => (
                    <Link key={article.title} href={article.href}>
                        <a className="flex flex-col rounded-lg shadow-lg overflow-hidden">
                            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                                <div className="flex-1">
                                        <span className="block mt-2">
                                            <p className="text-xl font-semibold text-gray-900">{article.title}</p>
                                            <p className="mt-3 text-base text-gray-500">{article.description}</p>
                                        </span>
                                </div>
                                {article.concept && 
                                <div className="mt-6 flex items-center">
                                    <span className="bg-indigo-100 text-indigo-800 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium">
                                        {article.concept}
                                    </span>
                                </div>
                                }
                            </div>
                        </a>
                    </Link>
                ))}
                </div>
            </div>
        </div>
    )
}

ArticleListing.getCustomInitialProps = async ({
    agility,
    channelName,
    languageCode,
    item,
    dynamicPageItem,
    sitemapNode
  }) => {
    

    const children = await agility.getContentList({
        referenceName: item.fields.listedArticles.referencename,
        languageCode,
        filer: 'properties.itemOrder',
        contentLinkDepth: 3
    })

    const articles = normalizeListedArticles({
        listedArticles: children.items
    })

  
    return {
        articles
    }
  
  }


export default ArticleListing;