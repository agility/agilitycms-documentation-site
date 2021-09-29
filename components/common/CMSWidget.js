import React, { useState, useEffect } from "react";
/* This example requires Tailwind CSS v2.0+ */
import { XIcon, PencilAltIcon } from '@heroicons/react/outline'


/**
 * This is a CMS widget that helps editors jump to the appropriate CMS page they want to edit
 **/

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
  

const CMSWidget = ({ isPreview, isDevelopmentMode, page, dynamicPageItem }) => {
  const [open, setOpen] = useState(isPreview || isDevelopmentMode);

  useEffect(() => {
      function onKey(e) {
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyQ') {
            setOpen(!open);
        }  
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey)
  })

  const editPage = () => {
    let itemPath = null;
    if(dynamicPageItem) {
        itemPath = `content/listitem-${dynamicPageItem.contentID}`;
    } else {
        itemPath = `pages/page-${page.pageID}`
    }
  
    const cmsURL = `https://manager.agilitycms.com/instance/${process.env.NEXT_PUBLIC_AGILITY_GUID}/en-us/${itemPath}`;
    window.open(cmsURL)
  }

  if(open) {
    return (
        <div title="Edit this page in Agility" 
           className={classNames(
               isPreview || isDevelopmentMode ? 'bottom-20': 'bottom-0',
               'fixed z-50 pb-2 sm:pb-5'
           )}>
            <div className="mx-auto px-2 sm:px-6 lg:px-8">
            <div className="p-2 rounded-lg bg-indigo-600 shadow-lg sm:p-3">
                <div className="flex items-center justify-between flex-wrap">
                <div className="order-2 flex-shrink-0 sm:order-3">
                    <button
                        type="button"
                        title="Toggle Ctrl+Q"
                        className=" flex p-2 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-white"
                        onClick={editPage}
                    >
                        <span className="text-white mr-3">Edit Page</span>
                        <PencilAltIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                </div>
                </div>
            </div>
            </div>
    </div>
    )
  } else {
      return null;
  }
};

export default CMSWidget;
