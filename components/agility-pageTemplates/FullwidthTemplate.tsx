import React, { useEffect, useState } from 'react';
import { ContentZone, ContentZoneProps } from '@agility/nextjs';
import { getModule } from 'components/agility-pageModules';
import Footer from '../common/Footer';
import ArticleNav from '../common/ArticleNav';

const FullwidthTemplate = (props) => {
    return (
        <>
            <div id="FullwidthTemplate" className="grid grid-rows-1 grid-flow-col bg-white grid-cols-fullWidth">
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
