"use client";

import dynamic from "next/dynamic";

// EditorJS only works in the browser — client-only dynamic import
// (ssr: false must live in a client component in the App Router).
const BlockEditor = dynamic(() => import("./BlockEditor"), { ssr: false });

export default function BlockEditorClient() {
	return <BlockEditor />;
}
