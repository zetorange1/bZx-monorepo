import React from "react";
import ReactDOM from "react-dom";
import BZXWidget from "bzx-widget-react";
import BZXWidgetProviderDummy from "bzx-widget-provider-dummy";

import * as serviceWorker from "./serviceWorker";

const currentProvider = new BZXWidgetProviderDummy();
ReactDOM.render(<BZXWidget provider={currentProvider} />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
