import React from "react";
import Heading from './Heading'
import Code from './Code'
import Embed from './Embed'
import Image from './Image'
import List from './List'
import Info from './Info'
import RawHTML from './RawHTML'
import Table from './Table'
import Paragraph from './Paragraph'
import Warning from './Warning'
import Delimiter from './Delimiter'

const BlockComponentDefinitions = {
    'header': { 
      component: Heading,
      useProse: true
    },
    'paragraph': {
      component: Paragraph,
      useProse: true
    },
    'code': {
      component: Code,
      useProse: false
    },
    'delimiter': {
      component: Delimiter,
      useProse: false
    },
    'embed': {
      component: Embed,
      useProse: false
    },
    'image': {
      component: Image,
      useProse: true
    },
    'list': {
      component: List,
      useProse: true
    },
    'quote': {
      component: Info,
      useProse: false
    },
    'warning': {
      component: Warning,
      useProse: false
    },
    'table': {
      component: Table,
      useProse: false,
    },
    'raw': {
      component: RawHTML,
      useProse: false
    }
}

const Blocks = ({ blocks }) => {
    let blockRenderMarkup = null;
    //only work with Blocks we can handle...
    const blocksFiltered = blocks.filter((block, id) => {
        if(BlockComponentDefinitions[block.type]){ 
            return true
        } else {
            return false;
        }
    })
    
    //create a grouping of blocks which either will be within a `prose` tailwindcss container or not
    let blockGroupings = [];
    
    blocksFiltered.map((block, idx) => {
        const blockDef = BlockComponentDefinitions[block.type];

        if(idx === 0 || blockGroupings[blockGroupings.length -1].useProse !== blockDef.useProse) {
          blockGroupings.push({
            useProse: blockDef.useProse,
            blocks: [{ Component: blockDef.component, block: block }]
          })
        } else {
          blockGroupings[blockGroupings.length -1].blocks.push({ Component: blockDef.component, block: block });
        }
    })
    console.log(blockGroupings);
  return (
      <div>
        {blockGroupings.map((blockGrouping, idx) => {
          if(blockGrouping.useProse) {
            return (
              <div key={idx} className="prose prose-lg">
                {blockGrouping.blocks.map((BlockToRender, idx2) => {
                  return <BlockToRender.Component key={BlockToRender.block.id} id={BlockToRender.block.id} {...BlockToRender.block.data} />
                })}
              </div>
            )
          } else {
            return (
                blockGrouping.blocks.map((BlockToRender, idx2) => {
                  return <BlockToRender.Component key={BlockToRender.block.id} id={BlockToRender.block.id} {...BlockToRender.block.data} />
                })
            )
          }
        })}
      </div>
    
  );
};

export default Blocks;
