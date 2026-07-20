"use client";

import { ChangeEvent } from 'react';

export const FilterBlock = ({ filterOptions, setFilterSelection, filterSelection }) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked && !filterSelection.includes(e.target.value)) {
            setFilterSelection([...filterSelection, e.target.value]);
        } else {
            setFilterSelection(filterSelection.filter((selection: string) => selection !== e.target.value));
        }
    };
    return (
        <div className="p-5 text-lg">
            <h4 className="pb-3 text-(--text-2)">Filter</h4>
            {filterOptions.map((filterOption: { title: string; id: number }) => {
                return (
                    <div key={filterOption.id} className="pb-2 group">
                        <input
                            className="form-checkbox h-5 w-5 text-(--primary) rounded-sm cursor-pointer border-(--border-strong) focus:ring-(--primary) focus:ring-offset-0"
                            type="checkbox"
                            value={filterOption.id}
                            id={`${filterOption.id}`}
                            onChange={(e) => handleChange(e)}
                        />
                        <label className="group-hover:text-(--primary) inline-block text-base cursor-pointer text-(--text-2) ml-3" htmlFor={`${filterOption.id}`}>
                            {filterOption.title}
                        </label>
                    </div>
                );
            })}
        </div>
    );
};