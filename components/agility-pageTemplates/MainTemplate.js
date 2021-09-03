import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Sidenav from '../common/Sidenav'
import Footer from '../common/Footer'

const MainTemplate = (props) => {
  
  return (
    <div id="MainTemplate" className="flex flex-grow bg-white overflow-hidden">
      <div id="ScrollContainer" className="flex-grow overflow-y-auto">
        <ContentZone name="MainContentZone" {...props} getModule={getModule} />
        <Footer />
      </div>
    </div>
  );
};

export default MainTemplate;
