export default class BZXWidgetProviderDummy {
  transactionId = "0x";

  onLendOrderApprove = (value, callback) => {
    console.log("DummyProvider `onLendOrderApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };

  onBorrowOrderApprove = (value, callback) => {
    console.log("DummyProvider `onBorrowOrderApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };

  onQuickPositionApprove = (value, callback) => {
    console.log("DummyProvider `onQuickPositionApprove`:");
    console.dir(value);
    callback(this.transactionId);
  };
}
