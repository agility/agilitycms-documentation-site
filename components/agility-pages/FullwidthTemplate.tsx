'use client'

import React, { useEffect, useState } from 'react';
import { ContentZone } from '@agility/nextjs';
import { getModule } from 'components/agility-components';

const FullwidthTemplate = (props) => {
    return (
        <>
            <div id="FullwidthTemplate" className="lg:grid grid-rows-1 grid-flow-col bg-white grid-cols-fullWidth">
                <ContentZone
                    name="MainContentZone"
                    {...props}
                    getModule={getModule}
                />
            </div>
        </>
    );
};

export default FullwidthTemplate;
