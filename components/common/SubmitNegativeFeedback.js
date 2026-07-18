"use client";

import { useRef, useState } from "react";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import nextConfig from "next.config";
import { Dialog, DialogContent, DialogTitle } from "components/ui/dialog";

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
    fetch(`${nextConfig.basePath}/api/feedback/sendNegative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, title, text }),
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && cancel()}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          textareaRef.current?.focus();
        }}
      >
        <form onSubmit={submit}>
          <div className="flex items-center">
            <div className="bg-(--raised) p-3 rounded-full">
              <SpeakerphoneIcon
                className="h-6 w-6 text-(--primary)"
                aria-hidden="true"
              />
            </div>
            <DialogTitle className="text-2xl leading-6 font-medium text-(--text) ml-3">
              Submit Feedback
            </DialogTitle>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <textarea
              ref={textareaRef}
              id="submitFeedback"
              name="message"
              rows={3}
              className={`h-32 mt-5 shadow-xs block w-full focus:outline-hidden focus:ring-1 focus:ring-(--primary) resize-none text-(--text) sm:text-sm border border-(--border)  ${
                textCount > 0 ? `bg-(--surface)` : `bg-(--raised)`
              }`}
              maxLength={maxTextLength}
              value={text}
              onChange={updateText}
              required
              placeholder="Enter your feedback here..."
            />
            <div className="mt-3 text-sm text-(--muted)">
              {textCount}/{maxTextLength}
            </div>
          </div>
          <div className="sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center border-2 border-(--primary) shadow-xs px-4 py-2 bg-(--surface) text-base font-semibold text-(--primary) sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => cancel()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mt-3 w-full inline-flex justify-center border-2 border-transparent shadow-xs px-4 py-2 bg-(--primary) text-base font-semibold text-white sm:ml-0 sm:w-auto sm:text-sm"
            >
              Submit
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
