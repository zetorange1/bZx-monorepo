import Button from "material-ui/Button";
import OrderItem from "./OrderItem";

export default class OrderHistory extends React.Component {
  state = { orders: [], loading: false };

  componentDidMount() {
    this.getOrders();
  }

  getOrders = async () => {
    const { b0x, accounts } = this.props;
    this.setState({ loading: true });
    const orders = await b0x.getOrders({
      loanPartyAddress: accounts[0].toLowerCase(),
      start: 0,
      count: 10
    });
    this.setState({ orders, loading: false });
  };

  render() {
    const { orders, loading } = this.state;
    return (
      <div>
        <div>
          <Button onClick={this.getOrders} variant="raised">
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </div>
        <br />
        {orders.length > 0 ? (
          orders.map(order => <OrderItem order={order} />)
        ) : (
          <p>You have no orders, try refreshing.</p>
        )}
      </div>
    );
  }
}

// "Order History" - shows a history of orders (loans) taken of which the user of the portal was involved (lendOrderHash is the identifier)
// 	- if the user of the portal was the "trader" for the order, they should be able to link to PART 2 for active loans or closed loans
// 	- if the user of the portal was the "lender" for the order, they should be able to link to PART 3 for active loans or closed loans
// 	- note: all "active" loans a user has opened will be returned from the smart contract, and the last 5 inactive (pending or closed) will be returned
