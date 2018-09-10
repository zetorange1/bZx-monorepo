import React from "react";
import { makeCancelable as m } from "./utils";

export default class BZxComponent extends React.Component {

    promiseList = [];

    componentWillUnmount() {
        this.promiseList.forEach(function(p) {
           p.cancel();
           //console.log(`cancel promise`);
        });
    }

    makeCancelable = m;
    wrapAndRun = async (promise) => {
        const p = await this.makeCancelable(promise);
        await this.promiseList.push(p);
        return p.promise;
    };

}