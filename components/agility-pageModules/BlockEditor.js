import React, { useEffect } from "react";
import { renderHTML } from "@agility/nextjs";
import Blocks from '../common/blocks/index'

const BlockEditor = ({ module }) => {
  // get module fields
  const { fields } = module;
  const blocks = JSON.parse(module.fields.content).blocks;

  return (
    <div className="flex flex-row justify-center">
     
      <div className="relative px-8">
        <div className="max-w-2xl mx-auto my-12 md:mt-18 lg:mt-20">
          <Blocks blocks= {blocks} />
        </div>
        
      </div>
    </div>
    
  );
};

export default BlockEditor;
