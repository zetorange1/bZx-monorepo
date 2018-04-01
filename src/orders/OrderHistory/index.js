import styled from "styled-components";
import MuiButton from "material-ui/Button";
import OrderItem from "./OrderItem";

const ShowCount = styled.div`
  display: inline-block;
  margin: 12px;
`;

const Button = styled(MuiButton)`
  margin: 12px !important;
`;

export default class OrderHistory extends React.Component {
  state = { orders: [], loading: false, count: 10 };

  componentDidMount() {
    this.getOrders();
  }

  getOrders = async () => {
    const { b0x, accounts } = this.props;
    this.setState({ orders: [], loading: true });
    const orders = await b0x.getOrders({
      loanPartyAddress: accounts[0].toLowerCase(),
      start: 0,
      count: this.state.count
    });
    this.setState({ orders, loading: false });
  };

  increaseCount = () => {
    this.setState(
      prev => ({
        count: prev.count + 10
      }),
      this.getOrders
    );
  };

  render() {
    const { b0x, accounts } = this.props;
    const { orders, loading, count } = this.state;
    return (
      <div>
        <div>
          <ShowCount>
            Showing last {count} orders ({orders.length} orders found).
          </ShowCount>
          <Button onClick={this.increaseCount} variant="raised" color="primary">
            Show more
          </Button>
          <Button onClick={this.getOrders} variant="raised" disabled={loading}>
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </div>
        <br />
        {orders.length > 0 ? (
          orders.map(order => (
            <OrderItem b0x={b0x} accounts={accounts} order={order} />
          ))
        ) : (
          <p>You have no orders, try refreshing.</p>
        )}
        {orders.length > 0 && (
          <div>
            <Button onClick={this.increaseCount} variant="primary" fullWidth>
              Show More
            </Button>
          </div>
        )}
      </div>
    );
  }
}

// "Order History" - shows a history of orders (loans) taken of which the user of the portal was involved (lendOrderHash is the identifier)
// 	- if the user of the portal was the "trader" for the order, they should be able to link to PART 2 for active loans or closed loans
// 	- if the user of the portal was the "lender" for the order, they should be able to link to PART 3 for active loans or closed loans
// 	- note: all "active" loans a user has opened will be returned from the smart contract, and the last 5 inactive (pending or closed) will be returned
