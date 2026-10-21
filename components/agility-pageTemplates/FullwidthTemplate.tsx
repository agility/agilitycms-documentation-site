import React from 'react';
import { ContentZone, ContentZoneProps } from '@agility/nextjs';
import { getModule } from 'components/agility-pageModules';
import Footer from '../common/Footer';

const FullwidthTemplate = (props) => {
    return (
        <>
            {/* The hero relies on its template for side padding (it's flush with the
                shell column in the other templates), but this one has none, so on
                the changelog it ran to the screen edge. Give it the same padding and
                centred width as the changelog list below it. */}
            <div
                id="FullwidthTemplate"
                className="lg:grid grid-rows-1 grid-flow-col bg-(--bg) text-(--text) grid-cols-fullWidth [&>.hero-heading]:px-4 sm:[&>.hero-heading]:px-6 lg:[&>.hero-heading]:px-8 [&>.hero-heading>div]:mx-auto [&>.hero-heading>div]:max-w-5xl"
            >
                <ContentZone
                    name="MainContentZone"
                    {...props}
                    getModule={getModule}
                />
            </div>
            <Footer languageCode={props.languageCode} isPreview={props.isPreview} />
        </>
    );
};

export default FullwidthTemplate;
