"use client";

import React, { useState } from "react";
import { ToggleSwitch } from "components/common/ToggleSwitch";

/**
 * Classic-UI toggle for articles that carry a `classicContent` body.
 *
 * Both bodies arrive as already-rendered React nodes (server components passed
 * as props), so switching is a visibility change — the article render path,
 * including highlight.js, never runs in the browser. Only articles that
 * actually have classic content pay for the second body.
 */
export const ClassicModeSwitch = ({
	standard,
	classic,
}: {
	standard: React.ReactNode;
	classic: React.ReactNode;
}) => {
	const [classicMode, setClassicMode] = useState(false);

	return (
		<>
			<div className="flex justify-end gap-2 mt-5">
				<ToggleSwitch
					label="Classic UI Version"
					checked={classicMode}
					setChecked={setClassicMode}
				/>
			</div>
			{/* Both stay mounted so toggling never re-runs a render pass; `hidden`
			    also keeps the inactive body out of the accessibility tree and out
			    of in-page find. */}
			<div hidden={classicMode}>{standard}</div>
			<div hidden={!classicMode}>{classic}</div>
		</>
	);
};

export default ClassicModeSwitch;
