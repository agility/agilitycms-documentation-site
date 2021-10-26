/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import axios from "axios";
import nextConfig from "next.config";

export default function SubmitNegativeFeedback({
  url,
  title,
  setNegativeFeedbackSubmitted,
  setNegativeFeedbackClicked,
}) {
  const [open, setOpen] = useState(true);
  const [textCount, setTextCount] = useState(0);
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  const maxTextLength = 500;

  const cancel = () => {
    setNegativeFeedbackClicked(false);
    setNegativeFeedbackSubmitted(false);
    setOpen(false);
  };

  const submit = (evt) => {
    evt.preventDefault();

    //validate data
    if (!text || text.length === 0) return;

    //post it... fire and forget
    axios.post(`${nextConfig.basePath}/api/feedback/sendNegative`, {
      url,
      title,
      text,
    });

    //don't wait for a response, just close it...
    setNegativeFeedbackSubmitted(true);
    setOpen(false);
  };

  const updateText = (evt) => {
    setText(evt.target.value);
    setTextCount(evt.target.value.length);
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-50 inset-0 overflow-y-auto"
        initialFocus={textareaRef}
        onClose={cancel}
      >
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
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
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
            <form
              onSubmit={submit}
              className="inline-block align-bottom bg-white px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6"
            >
              <div>
                <div className="flex items-center">
                  <div className="bg-lightGray p-3 rounded-full">
                    <SpeakerphoneIcon
                      className="h-6 w-6 text-brightPurple"
                      aria-hidden="true"
                    />
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-2xl leading-6 font-medium text-darkestGray ml-3"
                  >
                    Submit Feedback
                  </Dialog.Title>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <textarea
                    ref={textareaRef}
                    id="submitFeedback"
                    name="message"
                    rows={3}
                    className="h-32 mt-5 shadow-sm block w-full bg-lightGray text-darkestGray sm:text-sm border border-lightGray"
                    maxLength={maxTextLength}
                    value={text}
                    onChange={updateText}
                    required
                    placeholder="Enter your feedback here..."
                  />
                  <div className="mt-3 text-sm text-gray-400">
                    {textCount}/{maxTextLength}
                  </div>
                </div>
              </div>
              <div className="sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center border-2 border-purple shadow-sm px-4 py-2 bg-white text-base font-semibold text-purple sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => cancel()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mt-3 w-full inline-flex justify-center border-2 border-transparent shadow-sm px-4 py-2 bg-purple text-base font-semibold text-white sm:ml-0 sm:w-auto sm:text-sm"
                >
                  Submit
                </button>
              </div>
            </form>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
