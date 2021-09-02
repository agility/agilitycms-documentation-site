import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Sidenav from '../common/Sidenav'
import Footer from '../common/Footer'

const WithSidebarNavTemplate = (props) => {
  return (
    <div id="WithSidebarNavTemplate" className="flex flex-grow bg-white overflow-hidden">
      <div className="hidden lg:px-2 lg:flex lg:flex-shrink-0 overflow-y-auto">
        <Sidenav />
      </div>
      <div className="flex-grow overflow-y-auto">
        <ContentZone name="MainContentZone" {...props} getModule={getModule} />
        <Footer />
      </div>
    </div>
  );
};

export default WithSidebarNavTemplate;