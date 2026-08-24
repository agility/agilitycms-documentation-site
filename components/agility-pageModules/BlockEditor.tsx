// A server component: it only parses JSON and renders blocks — no state, no
// hooks, no browser APIs. It was marked "use client", which pulled Blocks (and
// through blocks/Code.tsx, all of highlight.js) into the client bundle.
import React from "react";
import Blocks from "../common/blocks/index";

interface BlockEditorProps {
  module: {
    fields: {
      // JSON string of EditorJS block data
      content: string;
    };
  };
}

const BlockEditor = ({ module }: BlockEditorProps) => {
  // get module fields
  const { fields } = module;
  const blocks = JSON.parse(module.fields.content).blocks;

  return (
    <div className="flex flex-row justify-center font-muli">
      <div className="relative px-8">
        <div className="max-w-2xl mx-auto my-12 md:mt-18 lg:mt-20">
          <Blocks blocks={blocks} />
        </div>
      </div>
    </div>
  );
};

export default BlockEditor;
