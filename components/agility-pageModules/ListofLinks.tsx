import { normalizeListedLinks } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

interface ListofLinksProps {
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
// Renders through the shared ocean SectionBand — the legacy darkTheme
// marketing band is retired; landings are one consistent system.
const ListofLinks = async ({ module, languageCode, isPreview }: ListofLinksProps) => {
  const { fields } = module;
  const actions = await getListedLinkActions({ fields, languageCode, isPreview });

  return (
    <SectionBand heading={fields.title} contentID={module.contentID} headingField="title">
      <LinkCardGrid items={actions} />
    </SectionBand>
  );
};

const getListedLinkActions = async ({
  fields,
  languageCode,
  isPreview,
}: {
  fields: ListofLinksProps["module"]["fields"];
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

export default ListofLinks;
