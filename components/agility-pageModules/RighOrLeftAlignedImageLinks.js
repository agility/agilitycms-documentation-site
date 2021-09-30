import Link from 'next/link'
import { getHrefRel, getHrefTarget } from '../../utils/linkUtils'

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const RightOrLeftAlignedImageLinks = ({ module, customData }) => {
    const { fields } = module;
    const { actions } = customData;
    return (
    <div className={classNames(
        fields.rightAlignLinks ? "lg:flex-row" : "lg:flex-row-reverse",
        "flex flex-col max-w-2xl lg:max-w-5xl mx-auto my-10")
        }>
        <div className="lg:w-2/5 text-center lg:text-left mb-5 lg:mb-0">
            <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-gray-900">{fields.title}</h2>
            <p className="text-gray-500">{fields.subTitle}</p>
        </div>
        <div className={classNames(
            fields.rightAlignLinks ? "lg:ml-auto" : 'lg:mr-auto',
            "lg:w-1/2 rounded-lg mb-10 bg-gray-200 overflow-hidden shadow-xl divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px")
            }>
        {actions.map((action, actionIdx) => {
            return (
                <div
                    key={action.title}
                    className={classNames(
                        'relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500'
                    )}
                >

                <div className="flex flex-row items-center">
                    <div className="mr-6">
                        
                        <span
                            className={classNames(
                            'bg-white',
                            'text-white',
                            'rounded-lg inline-flex p-3 ring-4 ring-white'
                            )}
                        >
                            <img src={`${action.image}?w=40`} className="w-10" aria-hidden="true" />
                        
                        </span>
                        
                    </div>
                    
                    <div className="">
                        <h3 className="text-lg font-medium">
                            <Link href={action.href} target={action.target} rel={action.rel}>
                                <a className="focus:outline-none">
                                    {/* Extend touch target to entire panel */}
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    {action.title}
                                </a>
                            </Link>
                        </h3>
                    </div>
                    
                </div>

            </div>
        )})}
        </div>
    </div>   
    )
}

RightOrLeftAlignedImageLinks.getCustomInitialProps = async ({
    agility,
    channelName,
    languageCode,
    item,
    dynamicPageItem,
    sitemapNode
  }) => {
    
    let actions = [];
    
    if(item.fields.children && item.fields.children.referencename) {
        const children = await agility.getContentList({
            referenceName: item.fields.children.referencename,
            languageCode,
            sort: 'properties.itemOrder',
            contentLinkDepth: 1
        })
        
        if(children && children.items) {
            actions = children.items.map((item) => {
                return {
                    title: item.fields.uRL?.text,
                    href: item.fields.uRL?.href,
                    image: item.fields.image?.url,
                    imageAlt: item.fields.image?.label,
                    target: getHrefTarget(item.fields.uRL?.href),
                    rel: getHrefRel(item.fields.uRL?.href)
                }
            })
        }
    }

    return {
      actions
    }
    
  }


export default RightOrLeftAlignedImageLinks;
