"use client";

import React, { FC, useId } from "react";
import { default as cn } from "classnames";

export interface IToggleSwitchProps {
	label: string;
	checked: boolean;
	setChecked: (checked: boolean) => void;
}

/** Accessible toggle switch (plain button + aria-checked — no UI library). */
export const ToggleSwitch: FC<IToggleSwitchProps> = ({
	label,
	checked,
	setChecked,
}) => {
	const id = useId();

	return (
		<div className="flex items-center">
			<label htmlFor={id} className="mr-4 font-normal text-sm cursor-pointer">
				{label}
			</label>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => setChecked(!checked)}
				className={cn(
					checked ? "bg-(--primary)" : "bg-(--border-strong)",
					"group relative inline-flex h-4 w-10 items-center rounded-full transition-colors focus:outline-hidden focus:ring-1 focus:ring-(--border-strong)"
				)}
			>
				<span
					className={`${
						checked ? "translate-x-6" : "translate-x-0"
					} inline-block h-5 w-5 transform rounded-full bg-(--surface) transition-transform shadow`}
				/>
			</button>
		</div>
	);
};
