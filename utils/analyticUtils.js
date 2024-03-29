import ReactGA from "react-ga";

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

export const initGA = () => {
  console.log("GA init");
  ReactGA.initialize(GA_TRACKING_ID);
};

export const logPageView = (url) => {
  console.log(`Logging pageview for ${url}`);
  ReactGA.set({ page: url });
  ReactGA.pageview(url);

  //also log this page view in hubspot
  const _hsq = (window._hsq = window._hsq || [])
  if (_hsq) {
    _hsq.push(["setPath", location.pathname])
    _hsq.push(["trackPageView"])
  }
};

export const logEvent = (category = "", action = "") => {
  if (category && action) {
    ReactGA.event({ category, action });
  }
};

export const logException = (description = "", fatal = false) => {
  if (description) {
    ReactGA.exception({ description, fatal });
  }
};
