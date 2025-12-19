import React, { useEffect, useState } from 'react';
import { ContentZone, ContentZoneProps } from '@agility/nextjs';
import { getModule } from 'components/agility-pageModules';
import Footer from '../common/Footer';

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
            <Footer
                navigation={props.footerNavigation}
                bottomNavigation={props.footerBottomNavigation}
                copyright={props.footerCopyright}
            />
        </>
    );
};

export default FullwidthTemplate;
