import MainTemplate from "./MainTemplate";
import WithSidebarNavTemplate from "./WithSidebarNavTemplate";
import FullWidthTemplate from "./FullwidthTemplate";

// All of the Agility Page Template Components that are in use in this site need to be imported into this index file.
// Place Page Templates in allTemplates array below, passing in a name and the component.

const allTemplates = [
  { name: "MainTemplate", template: MainTemplate },
  { name: "WithSidebarNavTemplate", template: WithSidebarNavTemplate },
  { name: "FullwidthTemplate", template: FullWidthTemplate },
];

export const getPageTemplate = (templateName) => {
  if (!templateName) return null;
  const obj = allTemplates.find(
    (m) => m.name.toLowerCase() === templateName.toLowerCase()
  );
  if (!obj) return null;
  return obj?.template;
};

