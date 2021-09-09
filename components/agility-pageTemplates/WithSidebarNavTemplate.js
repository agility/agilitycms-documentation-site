import React, {useEffect} from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from '../common/Footer'

const WithSidebarNavTemplate = (props) => {

    return (
        <div id="WithSidebarNavTemplate" className="flex flex-grow bg-white overflow-hidden">
        <div className="hidden lg:pl-2 lg:flex lg:flex-shrink-0 overflow-y-auto">
            <ContentZone name="SidebarContentZone" {...props} getModule={getModule} />
        </div>
        <div id="ScrollContainer" className="flex-grow overflow-y-auto">
            <div id="ContentContainer">
                <ContentZone name="MainContentZone" {...props} getModule={getModule} />
            </div>
            <Footer />  
        </div>
        </div>
    );
};

export default WithSidebarNavTemplate;
