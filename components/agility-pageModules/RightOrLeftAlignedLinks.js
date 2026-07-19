import { normalizeListedLinks } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

// Server component: fetches its own child links (was getCustomInitialProps).
// The legacy left/right split layout (heading beside a stacked link list,
// with dead space) is retired — heading + intro above a card grid, through
// the shared ocean SectionBand.
const RightOrLeftAlignedLinks = async ({ module, languageCode, isPreview }) => {
  const { fields } = module;
  const actions = await getLinkActions({ fields, languageCode, isPreview });

  return (
    <SectionBand heading={fields.title} intro={fields.subTitle}>
      <LinkCardGrid items={actions} />
    </SectionBand>
  );
};

const getLinkActions = async ({ fields, languageCode, isPreview }) => {
  let actions = [];

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
