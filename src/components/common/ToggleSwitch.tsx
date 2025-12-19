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
            checked ? 'bg-purple' : 'bg-gray-200',
          "group relative inline-flex h-4 w-10 items-center rounded-full transition-colors focus:outline-none ")}
        >
          <span
            className={`${
              checked ? 'translate-x-6' : '-translate-x-0'
            } inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow shadow-slate-500 group-focus:ring-1 group-focus:ring-gray-200 group-focus:ring-offset-0`}
          />
        </Switch>
      </div>
    </Switch.Group>
	)

};
