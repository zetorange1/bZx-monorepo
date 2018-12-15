import React from "react";
import ReactDOM from "react-dom";
import BZXWidget from "@bzxnetwork/bzx-widget-react";
import BZXWidgetProviderAugur from "@bzxnetwork/bzx-widget-provider-augur";
import BZXWidgetProviderDummy from "@bzxnetwork/bzx-widget-provider-dummy";

import * as serviceWorker from "./serviceWorker";

const widgetStyles = {
  padding: "20px",
  margin: "20px",
  width: "480px"
};
const currentProvider = new BZXWidgetProviderAugur();
ReactDOM.render(<BZXWidget widgetStyles={widgetStyles} provider={currentProvider} />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
