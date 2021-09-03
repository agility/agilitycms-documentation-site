import { renderHTML } from '@agility/nextjs';

const RawHTML = ({id, html }) => {
  return (
    <div className="mt-8 mb-8" dangerouslySetInnerHTML={renderHTML(html)} />
  )
}

export default RawHTML;