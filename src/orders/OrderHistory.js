export default class OrderHistory extends React.Component {
  state = {};

  render() {
    return <div>Order history stuff here</div>;
  }
}

// "Order History" - shows a history of orders (loans) taken of which the user of the portal was involved (lendOrderHash is the identifier)
// 	- if the user of the portal was the "trader" for the order, they should be able to link to PART 2 for active loans or closed loans
// 	- if the user of the portal was the "lender" for the order, they should be able to link to PART 3 for active loans or closed loans
// 	- note: all "active" loans a user has opened will be returned from the smart contract, and the last 5 inactive (pending or closed) will be returned
//   - for "pending" (not yet "taken" loans), the maker of the order should have a cancel function (details of how this works TBD)
