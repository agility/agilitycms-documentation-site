import React, { useState } from "react";
/* This example requires Tailwind CSS v2.0+ */
import { SpeakerphoneIcon, XIcon, EyeIcon } from '@heroicons/react/outline'


/**
 * This is a preview bar that is enabled by default to handle viewing content in preview & live mode, remove this for production use.
 **/

const PreviewWiget = ({ isPreview, isDevelopmentMode }) => {
  const [open, setOpen] = useState(false);

  if(!isPreview && !isDevelopmentMode) {
      return null;
  }

  // handle view function to determine preview / live mode
  const handleView = () => {
    if (isDevelopmentMode) {
      alert("You are currently in Development Mode, Live Mode is unavailable. Use `yarn build && yarn start` to run a production build locally in Live Mode.");
    } else {
      
        const exit = confirm("Would you like to exit Preview Mode?");
        if (exit === true) {
            window.location.href = `/api/exitPreview?slug=${window.location.pathname}`;
        } 
    }
  };

  return (
    <div title="You are in Preview Mode" className="fixed bottom-0 z-50 pb-2 sm:pb-5">
    <div className="w-44 mx-auto px-2 sm:px-6 lg:px-8">
      <div className="p-2 rounded-lg bg-purple-600 shadow-lg sm:p-3">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-purple-800">
              <EyeIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
            <button
              type="button"
              title="Click to exit Preview Mode"
              className="-mr-1 flex p-2 rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-white"
              onClick={handleView}
            >
              <span className="sr-only">Close Preview</span>
              <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
};

export default PreviewWiget;
