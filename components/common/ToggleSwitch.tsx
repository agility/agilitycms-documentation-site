"use client";

import React, { FC, useEffect, useState } from 'react';
import { default as cn } from 'classnames';
import { Switch } from '@headlessui/react';

export interface IToggleSwitchProps {
	label: string;
	checked: boolean;
	setChecked: (checked: boolean) => void;
}

/** Comment */
export const ToggleSwitch: FC<IToggleSwitchProps> = ({
	label,
	checked,
	setChecked
}) => {

	return (
		<Switch.Group>
      <div className="flex items-center">
        <Switch.Label className="mr-4 font-normal text-sm">{label}</Switch.Label>
        <Switch
          checked={checked}
          onChange={setChecked}
          className={cn(
            checked ? 'bg-(--primary)' : 'bg-(--border-strong)',
          "group relative inline-flex h-4 w-10 items-center rounded-full transition-colors focus:outline-hidden ")}
        >
          <span
            className={`${
              checked ? 'translate-x-6' : 'translate-x-0'
            } inline-block h-5 w-5 transform rounded-full bg-(--surface) transition-transform shadow group-focus:ring-1 group-focus:ring-(--border-strong) group-focus:ring-offset-0`}
          />
        </Switch>
      </div>
    </Switch.Group>
	)

};
