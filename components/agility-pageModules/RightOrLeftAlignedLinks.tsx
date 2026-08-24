import { normalizeListedLinks } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

interface RightOrLeftAlignedLinksProps {
  module: {
    contentID?: number;
    fields: {
      title: string;
      subTitle?: string;
      // {referencename} — the child links are fetched via the data layer
      children?: { referencename: string };
    };
  };
  languageCode: string;
  isPreview?: boolean;
}

// Server component: fetches its own child links (was getCustomInitialProps).
// The legacy left/right split layout (heading beside a stacked link list,
// with dead space) is retired — heading + intro above a card grid, through
// the shared ocean SectionBand.
const RightOrLeftAlignedLinks = async ({ module, languageCode, isPreview }: RightOrLeftAlignedLinksProps) => {
  const { fields } = module;
  const actions = await getLinkActions({ fields, languageCode, isPreview });

  return (
    <SectionBand heading={fields.title} intro={fields.subTitle} contentID={module.contentID} headingField="title" introField="subTitle">
      <LinkCardGrid items={actions} />
    </SectionBand>
  );
};

const getLinkActions = async ({
  fields,
  languageCode,
  isPreview,
}: {
  fields: RightOrLeftAlignedLinksProps["module"]["fields"];
  languageCode: string;
  isPreview?: boolean;
}) => {
  let actions: any[] = [];

  if (fields.children && fields.children.referencename) {
    const children = await getContentList({
      referenceName: fields.children.referencename,
      locale: languageCode,
      preview: !!isPreview,
      sort: "properties.itemOrder",
      contentLinkDepth: 3,
      take: 50,
    });

    if (children && children.items) {
      actions = await normalizeListedLinks({
        listedLinks: children.items,
        locale: languageCode,
        preview: !!isPreview,
      });
    }
  }

  return actions;
};

export default RightOrLeftAlignedLinks;
