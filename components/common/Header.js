/*
  This example requires Tailwind CSS v2.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import React, { Fragment } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { SearchIcon } from '@heroicons/react/solid'
import { LoginIcon, MenuIcon, XIcon, SupportIcon, ChevronRightIcon } from '@heroicons/react/outline'
import ButtonDropdown from '../common/ButtonDropdown'
import Link from 'next/link'

import algoliasearch from 'algoliasearch/lite';
import { createAutocomplete } from '@algolia/autocomplete-core';
import { getAlgoliaResults } from '@algolia/autocomplete-preset-algolia';
import { renderHTML } from '@agility/nextjs'




function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}


const loginButton = {
  name: 'Login',
  href: 'https://manager.agilitycms.com/',
  icon: LoginIcon
}

const supportButton = {
  name: 'Get Support',
  href: 'https://help.agilitycms.com/hc/en-us/requests/new',
  icon: SupportIcon
}

const searchClient = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY);

export default function Header({ mainMenuLinks, primaryDropdownLinks, secondaryDropdownLinks }) {
  
  const navigation = mainMenuLinks;
  const apiSDKsButton = {
    name: 'APIs & SDKs',
    children: primaryDropdownLinks.map((l) => {
      return {
        name: l.text,
        href: l.href
      }
    }),
    children2: secondaryDropdownLinks.map((l) => {
      return {
        name: l.text,
        href: l.href
      }
    })
  }

  return (
    <Disclosure id="Header" as="header" className="flex-shrink-0 bg-white shadow z-40 relative">
      {({ open }) => (
        <>
          <div className="mx-auto px-2 sm:px-4  lg:px-8">
            <div className="relative h-16 flex justify-between">
              <div className="relative z-10 px-2 flex lg:px-0">
                <div className="flex-shrink-0 flex items-center">
                  <img
                    className="block h-8 w-auto"
                    src="https://tailwindui.com/img/logos/workflow-mark-indigo-600.svg"
                    alt="Workflow"
                  />
                </div>
              </div>
              <div className="relative z-0 flex-1 px-2 flex items-center justify-center sm:absolute sm:inset-0">
              
                <div className="w-full max-w-xs lg:max-w-xl">
                  <label htmlFor="search" className="sr-only">
                    Search
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <Autocomplete />
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center lg:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <span className="sr-only">Open menu</span>
                  {open ? (
                    <XIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>

              <div className="hidden lg:relative lg:z-10 lg:ml-4 lg:flex lg:items-center">
                <a href={loginButton.href} rel="noreferrer" className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                        {loginButton.name}
                </a>
              </div>
            </div>
            <nav className="hidden lg:py-2 lg:flex " aria-label="Global">
                <div className="lg:space-x-8">
                    {navigation.map((item) => (
                      <Link key={item.name} href={item.href}>
                        <a
                          className={classNames(
                              item.current ? 'bg-gray-100 text-gray-900' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900',
                              'rounded-md py-2 px-3 inline-flex items-center text-sm font-medium'
                          )}
                          aria-current={item.current ? 'page' : undefined}
                          >
                          {item.name}
                        </a>
                      </Link>
                    ))}
                </div>
              
                <div className="ml-auto">
                    <ButtonDropdown {...apiSDKsButton} />
                    <a href={supportButton.href} rel="noreferrer" className="ml-6 text-gray-500">
                        {supportButton.name} <supportButton.icon className="w-5 inline" />
                    </a>
                </div>
            </nav>

            
          </div>

          <Disclosure.Panel as="nav" className="lg:hidden" aria-label="Global">
            <div className="pt-2 pb-3 px-2 space-y-1">
              {navigation.map((item) => (
                <Link key={item.name}
                    href={item.href}>
                  <a
                    className={classNames(
                      item.current ? 'bg-gray-100 text-gray-900' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900',
                      'block rounded-md py-2 px-3 text-base font-medium'
                    )}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    {item.name}
                  </a>
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 pb-3">
              
              <div className=" px-2 space-y-1">
                <a href={loginButton.href} rel="noreferrer" className="block rounded-md py-2 px-3 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                        {loginButton.name} <loginButton.icon className="w-5 inline" />
                    </a>
                <a href={supportButton.href} rel="noreferrer" className="block rounded-md py-2 px-3 text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                        {supportButton.name} <supportButton.icon className="w-5 inline" />
                </a>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}


function Autocomplete() {
  // (1) Create a React state.
  const inputRef = React.useRef(null)
  const [autocompleteState, setAutocompleteState] = React.useState({});
  const autocomplete = React.useMemo(
    () =>
      createAutocomplete({
        onStateChange({ state }) {
          // (2) Synchronize the Autocomplete state with the React state.
          setAutocompleteState(state);
        },
        getSources() {
          return [
            // (3) Use an Algolia index source.
            {
              sourceId: 'articles',
              getItemInputValue({ item }) {
                return item.query;
              },
              getItems({ query }) {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: 'doc_site',
                      query,
                      params: {
                        hitsPerPage: 4,
                        highlightPreTag: '<mark>',
                        highlightPostTag: '</mark>',
                      },
                    },
                  ],
                });
              },
              getItemUrl({ item }) {
                return item.url;
              },
            },
          ];
        },
      }),
    []
  );

  return (
    <div className="aa-Autocomplete" {...autocomplete.getRootProps({})}>
      <form
        className="aa-Form"
        {...autocomplete.getFormProps({ inputElement: inputRef.current })}
      >
        <input 
        className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:text-gray-900 focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
         {...autocomplete.getInputProps({})} 
         placeholder="Search docs..."
         />
      </form>
      
      <div className="aa-Panel relative" {...autocomplete.getPanelProps({})}>
        {autocompleteState.isOpen &&
          autocompleteState.collections.map((collection, index) => {
            const { source, items } = collection;
            
            return (
              <div key={`source-${index}`} className="aa-Source absolute bg-white z-50 border border-gray-300 w-full">
                {items.length > 0 && (
                  <ul className="aa-List" {...autocomplete.getListProps()}>
                    {items.map((item) => (
                      <li
                        key={item.objectID}
                        className="aa-Item"
                        {...autocomplete.getItemProps({
                          item,
                          source,
                        })}
                      >
                        <Link href={item.url}>
                          <a className="SearchResult px-5 py-2 block w-full hover:bg-gray-50">
                              <span className="SearchResult__titlee block text-indigo-600 text-sm font-bold" dangerouslySetInnerHTML={renderHTML(item._highlightResult.title.value)}></span>

                              {item._highlightResult.description &&
                                <span className="SearchResult__description block text-sm mb-2" dangerouslySetInnerHTML={renderHTML(item._highlightResult.description.value)}></span>
                              }
                              <span className="SearchResult__category-section block text-xs font-light text-gray-600">
                                {item.category} <ChevronRightIcon className="inline w-2"/> {item.section}
                              </span>
                          </a>
                        </Link>
                        
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );

  // ...
}
