import EventEmitter from "events";

import { EVENT_ASSET_UPDATE } from "../../bzx-widget-common/src";

export default class BZXWidgetProviderDummy {
  transactionId = "0x";

  // assets available for selection in the input on top
  assets = [{ id: "weth", text: "ETH" }];
  // asset to select by default in the input on top
  defaultAsset = "weth";
  // event we emitting when we expect widget to update list of assets
  eventEmitter = new EventEmitter();

  getLendFormDefaults = () => {
    return {
      qty: "1",
      interestRate: 30,
      duration: 10,
      ratio: 2,
      relays: [],
      pushOnChain: false
    };
  };

  getLendFormOptions = () => {
    return {
      relays: ["Shark", "Veil"],
      ratios: [1, 2, 3],
      interestRateMin: 1,
      interestRateMax: 100,
      durationMin: 1,
      durationMax: 100
    };
  };

  getBorrowFormDefaults = () => {
    return {
      qty: "1",
      interestRate: 30,
      duration: 10,
      ratio: 2,
      relays: [],
      pushOnChain: false
    };
  };

  getBorrowFormOptions = () => {
    return {
      relays: ["Shark", "Veil"],
      ratios: [1, 2, 3],
      interestRateMin: 1,
      interestRateMax: 100,
      durationMin: 1,
      durationMax: 100
    };
  };

  getQuickPositionFormDefaults = () => {
    return {
      qty: "1",
      positionType: "long",
      ratio: 2,
      pushOnChain: false
    };
  };

  getQuickPositionFormOptions = () => {
    return {
      ratios: [1, 2, 3]
    };
  };

  doLendOrderApprove = (value) => {
    console.log("DummyProvider `doLendOrderApprove`:");
    console.dir(value);

    return new Promise((resolve, reject) => {
      resolve(this.transactionId);
    });
  };

  doBorrowOrderApprove = (value) => {
    console.log("DummyProvider `doBorrowOrderApprove`:");
    console.dir(value);

    return new Promise((resolve, reject) => {
      resolve(this.transactionId);
    });
  };

  doQuickPositionApprove = (value) => {
    console.log("DummyProvider `doQuickPositionApprove`:");
    console.dir(value);

    return new Promise((resolve, reject) => {
      resolve(this.transactionId);
    });
  };

  _handleAssetsUpdate() {
    this.eventEmitter.emit(EVENT_ASSET_UPDATE, this.assets, this.defaultAsset);
  }
}
