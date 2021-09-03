/* This example requires Tailwind CSS v2.0+ */
import { InformationCircleIcon } from '@heroicons/react/solid'
import { renderHTML } from '@agility/nextjs';

const Quote = ({ id, text, caption }) => {
  return (
    <div className="rounded-md bg-blue-50 p-4 mt-8 mb-8">
      <div className="flex">
        <div className="flex-shrink-0">
          <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm text-blue-700" dangerouslySetInnerHTML={renderHTML(text)}></p>
        </div>
      </div>
    </div>
  )
}

export default Quote;