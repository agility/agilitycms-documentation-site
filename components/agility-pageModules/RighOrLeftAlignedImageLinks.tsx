import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

interface RightOrLeftAlignedImageLinksProps {
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
// Legacy split layout retired — heading + intro above an image-tile card
// grid, through the shared ocean SectionBand.
const RightOrLeftAlignedImageLinks = async ({ module, languageCode, isPreview }: RightOrLeftAlignedImageLinksProps) => {
  const { fields } = module;
  const actions = await getImageLinkActions({ fields, languageCode, isPreview });

  return (
    <SectionBand heading={fields.title} intro={fields.subTitle} contentID={module.contentID} headingField="title" introField="subTitle">
      <LinkCardGrid items={actions} />
    </SectionBand>
  );
};

const getImageLinkActions = async ({
  fields,
  languageCode,
  isPreview,
}: {
  fields: RightOrLeftAlignedImageLinksProps["module"]["fields"];
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
      contentLinkDepth: 1,
      take: 50,
    });

    if (children && children.items) {
      actions = children.items.map((item: any) => {
        return {
          title: item.fields.uRL?.text,
          href: item.fields.uRL?.href,
          imageUrl: item.fields.image?.url,
          target: getHrefTarget(item.fields.uRL?.href),
          rel: getHrefRel(item.fields.uRL?.href),
        };
      });
    }
  }

  return actions;
};

export default RightOrLeftAlignedImageLinks;
