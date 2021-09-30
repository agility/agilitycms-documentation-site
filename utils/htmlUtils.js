import { getHrefTarget } from "./linkUtils";
import { parse } from 'node-html-parser'

const renderHTML = (html) => {
	if (!html) return { __html: "" };
	return { __html: cleanHTML(html) };
}

const cleanHTML = (html) => {
	if (!html) return "";
	
	//fix '~' in links in HTML
	html =  html.replace(/href="~\//gi, 'href="/');

	//set '_blank' target for absolute domains links
	const parsedHTML = parse(html);
	const links = parsedHTML.querySelectorAll('a');

	for(const link of links) {
		//set the appropriate target for the link
		const target = getHrefTarget(link.getAttribute('href'));
		link.setAttribute('target', target);
		if(target === '_blank') {
			link.setAttribute('rel', 'noopener')
		}
		//just in case we have some extra styles that somehow got pasted in...
		link.setAttribute('style', null);
	}

	if(links.length > 0) {
		html = parsedHTML.toString();
	}
	
	return html;

}

export {
	renderHTML
}