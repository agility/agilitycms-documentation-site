import RichTextArea from "./RichTextArea";
import DynamicArticleDetails from "./DynamicArticleDetails";
import SideBarNav from "./SideBarNav";
import BlockEditor from "./BlockEditor";
import HeroCategories from './HeroCategories'
import ListOfLinks from './ListofLinks'
import RightOrLeftAlignedLinks from './RightOrLeftAlignedLinks'
import ArticleListing from "./ArticleListing";

// All of the Agility Page Module Components that are in use in this site need to be imported into this index file.
// Place Page Modules in allModules array below, passing in a name and the component.

const allModules = [
  { name: "RichTextArea", module: RichTextArea },
  { name: "DynamicArticleDetails", module: DynamicArticleDetails },
  { name: "SideBarNav", module: SideBarNav },
  { name: "BlockEditor", module: BlockEditor },
  { name: "HeroCategories", module: HeroCategories },
  { name: "ListOfLinks", module: ListOfLinks },
  { name: "RightOrLeftAlignedLinks", module: RightOrLeftAlignedLinks },
  { name: "ArticleListing", module: ArticleListing },
];

export const getModule = (moduleName) => {
  if (!moduleName) return null;
  const obj = allModules.find(
    (m) => m.name.toLowerCase() === moduleName.toLowerCase()
  );

  if (!obj) return null;
  return obj.module;
};
