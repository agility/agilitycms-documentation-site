import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Sidenav from '../common/Sidenav'

const MainTemplate = (props) => {
  return (
    <div id="main-template" className="flex bg-white lg:px-6">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidenav />
      </div>
      <div className="flex flex-col w-0 flex-1">
        <ContentZone name="MainContentZone" {...props} getModule={getModule} />
      </div>
    </div>
  );
};

export default MainTemplate;
