export default class BZXWidgetProviderDummy {
  transactionId = "0x";

  // assets available for selection in the input on top
  assets = [{ id: "weth", text: "ETH" }];
  // asset to select by default in the input on top
  defaultAsset = "weth";
  // event we emitting when we expect widget to update list of assets
  onAssetsUpdate = () => {};

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

  doLendOrderApprove = (value, callback) => {
    console.log("DummyProvider `onLendOrderApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };

  doBorrowOrderApprove = (value, callback) => {
    console.log("DummyProvider `onBorrowOrderApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };

  doQuickPositionApprove = (value, callback) => {
    console.log("DummyProvider `onQuickPositionApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };

  _handleAssetsUpdate() {
    this.onAssetsUpdate(this.assets, this.defaultAsset);
  }
}
