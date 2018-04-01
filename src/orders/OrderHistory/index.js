import styled from "styled-components";
import MuiButton from "material-ui/Button";
import OrderItem from "./OrderItem";

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ShowCount = styled.div`
  display: inline-block;
  margin: 6px;
`;

const Button = styled(MuiButton)`
  margin: 6px !important;
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
        <InfoContainer>
          <ShowCount>
            Showing last {count} orders ({orders.length} orders found).
          </ShowCount>
          <Button onClick={this.increaseCount} variant="raised" color="primary">
            Show more
          </Button>
          <Button onClick={this.getOrders} variant="raised" disabled={loading}>
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>
        <br />
        {orders.length > 0 ? (
          orders.map(order => (
            <OrderItem b0x={b0x} accounts={accounts} order={order} />
          ))
        ) : (
          <p>You have no orders, try refreshing.</p>
        )}
      </div>
    );
  }
}
