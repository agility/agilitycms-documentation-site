import React, { useEffect, useState } from 'react';
import { ContentZone, ContentZoneProps } from '@agility/nextjs';
import { getModule } from 'components/agility-pageModules';
import Footer from '../common/Footer';
import ArticleNav from '../common/ArticleNav';

const FullwidthTemplate = (props) => {
    return (
        <>
            <div id="FullwidthTemplate" className="flex flex-grow bg-white">
                <ContentZone
                    name="MainContentZone"
                    {...props}
                    getModule={getModule}
                />
            </div>
            <Footer
                navigation={props.footerNavigation}
                bottomNavigation={props.footerBottomNavigation}
                pageTemplateName={props.pageTemplateName}
            />
        </>
    );
};

export default FullwidthTemplate;
