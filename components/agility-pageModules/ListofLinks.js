/*
  This example requires Tailwind CSS v2.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  const colors = require('tailwindcss/colors')
  
  module.exports = {
    // ...
    theme: {
      extend: {
        colors: {
          sky: colors.sky,
          teal: colors.teal,
          rose: colors.rose,
        },
      },
    },
  }
  ```
*/
import icons from '../common/Icons'
import Link from 'next/link'
import { normalizeListedLinks} from '../../utils/linkUtils'
  


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const ListofLinks = ({ module, customData }) => {
    const { fields } = module;
    const { actions } = customData;
    return (
    <div className="mx-auto my-10">
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-gray-900">{fields.title}</h2>
        <div className="rounded-lg m-auto mb-20  max-w-5xl bg-gray-200 overflow-hidden shadow-xl divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px">
        {actions.map((action, actionIdx) => {
            
            const ActionIcon = icons[action.icon];
            return (
                <div
                key={action.title}
                className={classNames(
                    actionIdx === 0 ? 'rounded-tl-lg rounded-tr-lg sm:rounded-tr-none' : '',
                    actionIdx === 1 ? 'sm:rounded-tr-lg' : '',
                    actionIdx === actions.length - 2 ? 'sm:rounded-bl-lg' : '',
                    actionIdx === actions.length - 1 ? 'rounded-bl-lg rounded-br-lg sm:rounded-bl-none' : '',
                    'relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500'
                )}
                >

                <div className=" flex flex-row">
                    <div className="mr-6">
                        {ActionIcon &&
                        <span
                            className={classNames(
                            'bg-indigo-600',
                            'text-white',
                            'rounded-lg inline-flex p-3 ring-4 ring-white'
                            )}
                        >
                            <ActionIcon className="h-6 w-6" aria-hidden="true" />
                        
                        </span>
                        }
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-medium">
                            <Link href={action.href}>
                                <a className="focus:outline-none">
                                    {/* Extend touch target to entire panel */}
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    {action.title}
                                </a>
                            </Link>
                        </h3>
                        <p className="mt-2 text-gray-500">
                            {action.description}
                        </p>
                    </div>
                    
                </div>
                {/* <span
                    className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                    aria-hidden="true"
                >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                    </svg>
                </span> */}
                </div>
        )})}
        </div>
    </div>   
    )
}

ListofLinks.getCustomInitialProps = async ({
    agility,
    channelName,
    languageCode,
    item,
    dynamicPageItem,
    sitemapNode
  }) => {
    
    const children = await agility.getContentList({
        referenceName: item.fields.children.referencename,
        languageCode,
        filer: 'properties.itemOrder',
        contentLinkDepth: 3
    })

    const actions = normalizeListedLinks({
        listedLinks: children.items
    })

  
    return {
      actions
    }
  
  }


export default ListofLinks;
