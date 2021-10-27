/* This example requires Tailwind CSS v2.0+ */
import { ExclamationIcon } from "@heroicons/react/solid";
import { renderHTML } from "@agility/nextjs";

const Warning = ({ id, title, message }) => {
  return (
    <div className="bg-yellow-50 p-4 mt-8 mb-8">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">{title}</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p dangerouslySetInnerHTML={renderHTML(message)}></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warning;
