import { Metadata } from "next";
import BlockEditorClient from "components/custom-fields/BlockEditorClient";

export const metadata: Metadata = {
	title: "Block Editor for Agility CMS (next js)",
	description: "Block Editor for Agility CMS",
};

/**
 * Custom field: EditorJS block editor, loaded inside an Agility CMS iframe.
 * The editor itself is client-only (no SSR).
 */
export default function BlockEditorPage() {
	const styles = `
		html, body { overflow: hidden }
		html { height: auto!important }
		h1, h2, h3, h4, h5, h6 { font-weight: bold!important }
		h1 { font-size: 2rem!important } h2 { font-size: 1.5rem!important } h3 { font-size: 1.17rem!important } h4 { font-size: 1rem!important } h5 { font-size: 0.83rem } h6 { font-size: 0.67rem }
	`;
	return (
		<div>
			<style>{styles}</style>
			<main>
				<BlockEditorClient />
			</main>
		</div>
	);
}
