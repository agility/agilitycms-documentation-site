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
                centred width as the changelog list below it (padding inside the
                max-w box, like the list, so the text lines up with its rows). */}
            <div
                id="FullwidthTemplate"
                className="lg:grid grid-rows-1 grid-flow-col bg-(--bg) text-(--text) grid-cols-fullWidth [&>.hero-heading>div]:mx-auto [&>.hero-heading>div]:max-w-5xl [&>.hero-heading>div]:px-4 sm:[&>.hero-heading>div]:px-6 lg:[&>.hero-heading>div]:px-8"
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
