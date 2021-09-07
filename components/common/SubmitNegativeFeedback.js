/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { SpeakerphoneIcon } from '@heroicons/react/outline'
import axios from 'axios'

export default function SubmitNegativeFeedback({ url, title, setNegativeFeedbackSubmitted, setNegativeFeedbackClicked }) {
  const [open, setOpen] = useState(true);
  const [textCount, setTextCount] = useState(0);
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const maxTextLength = 500;

  const cancel = () => {
    setNegativeFeedbackClicked(false);
    setNegativeFeedbackSubmitted(false);
    setOpen(false);
  }

  const submit = (evt) => {
    evt.preventDefault();

    //validate data
    if(!text || text.length === 0) return;

    //post it... fire and forget
    axios.post(`/api/feedback/sendNegative`, {
        url,
        title,
        text
    })

    //don't wait for a response, just close it...
    setNegativeFeedbackSubmitted(true);
    setOpen(false);
    
  }

  const updateText = (evt) => {
    setText(evt.target.value);
    setTextCount(evt.target.value.length);
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="fixed z-50 inset-0 overflow-y-auto" initialFocus={textareaRef} onClose={cancel}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            
            <form onSubmit={submit} className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 sm:mx-0 sm:h-10 sm:w-10">
                    <SpeakerphoneIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                            Submit Feedback
                        </Dialog.Title>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                            How can we improve our documentation?
                            </p>
                        </div>
                        <textarea
                            ref={textareaRef}
                            id="submitFeedback"
                            name="message"
                            rows={3}
                            className="h-32 mt-5 max-w-lg shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md"
                            maxLength={maxTextLength}
                            value={text}
                            onChange={updateText}
                            required
                            placeholder="Enter your feedback here..."
                        />
                        <div className="mt-3 text-sm text-gray-400">{textCount}/{maxTextLength}</div>
                    </div>
                </div>
                <div className="sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={() => cancel()}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-0 sm:w-auto sm:text-sm"
                    >
                        Submit
                    </button>
                </div>
            </form>
            
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

