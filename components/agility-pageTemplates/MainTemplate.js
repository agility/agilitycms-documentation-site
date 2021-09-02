import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Sidenav from '../common/Sidenav'

const MainTemplate = (props) => {
  return (
    <div id="MainTemplate" className="flex flex-grow bg-white lg:px-2 overflow-hidden">
      <div className="hidden lg:flex lg:flex-shrink-0 overflow-y-auto">
        <Sidenav />
      </div>
      <div className="flex-grow overflow-y-auto">
        <ContentZone name="MainContentZone" {...props} getModule={getModule} />
      </div>
    </div>
  );
};

export default MainTemplate;
