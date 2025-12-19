'use client'

import React from "react";
// import { ContentZone } from "@agility/nextjs"; // Temporarily disabled for build testing
// import { getModule } from "components/agility-pageModules"; // Temporarily disabled for build testing
import Footer from "../common/Footer";

const MainTemplate = (props) => {
  return (
    <div id="MainTemplate" className="flex flex-grow bg-white overflow-hidden">
      <div id="ScrollContainer" className="flex-grow overflow-y-auto">
        <div id="ContentContainer">
          {/* Temporarily disabled ContentZone to test build */}
          <div className="p-8">
            <h1 className="text-2xl font-bold">Build Test Mode</h1>
            <p>ContentZone temporarily disabled for build testing</p>
          </div>
          {/* <ContentZone
            name="MainContentZone"
            {...props}
            getModule={getModule}
          /> */}
        </div>
        <Footer navigation={props.footerNavigation} bottomNavigation={props.footerBottomNavigation} copyright={props.footerCopyright} />
      </div>
    </div>
  );
};

export default MainTemplate;
