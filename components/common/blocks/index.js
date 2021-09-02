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
    'header': Heading,
    'paragraph': Paragraph,
    'code': Code,
    'delimiter': Delimiter,
    'embed': Embed,
    'image': Image,
    'list': List,
    'quote': Info,
    'warning': Warning,
    'table': Table,
    'raw': RawHTML
}

const Blocks = ({ blocks }) => {
    const BlockComponentsToRender = blocks.filter((block, id) => {
        if(BlockComponentDefinitions[block.type]){ 
            return true
        } else {
            return false;
        }
    }).map((block) => {
        const BlockComponent = BlockComponentDefinitions[block.type];
        return <BlockComponent key={block.id} id={block.id} {...block.data} />;
    })
  return (
    <div>
      {BlockComponentsToRender}
    </div>
  );
};

export default Blocks;
