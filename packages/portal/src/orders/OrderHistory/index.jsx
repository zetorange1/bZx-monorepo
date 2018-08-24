import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
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
    this.getOrdersForUser();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.tabId === `Orders_OrderHistory` &&
      this.props.tabId !== prevProps.tabId
    )
      this.getOrdersForUser();
  }

  getOrdersForUser = async () => {
    const { bZx, accounts } = this.props;
    this.setState({ loading: true });
    const orders = await bZx.getOrdersForUser({
      loanPartyAddress: accounts[0].toLowerCase(),
      start: 0,
      count: this.state.count
    });
    console.log(orders);
    this.setState({ orders, loading: false });
  };

  increaseCount = () => {
    this.setState(
      prev => ({
        count: prev.count + 10
      }),
      this.getOrdersForUser
    );
  };

  render() {
    const { bZx, accounts, tokens } = this.props;
    const { orders, loading, count } = this.state;
    if (orders.length === 0) {
      return (
        <div>
          <InfoContainer>
            <ShowCount>No loan orders found.</ShowCount>
            <Button
              onClick={this.getOrdersForUser}
              variant="raised"
              disabled={loading}
            >
              {loading ? `Refreshing...` : `Refresh`}
            </Button>
          </InfoContainer>
        </div>
      );
    }
    return (
      <div>
        <InfoContainer>
          <ShowCount>
            Showing last {count} orders ({orders.length} orders found).
          </ShowCount>
          <Button onClick={this.increaseCount} variant="raised" color="primary">
            Show more
          </Button>
          <Button
            onClick={this.getOrdersForUser}
            variant="raised"
            disabled={loading}
          >
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>
        <br />
        {orders.length > 0 ? (
          orders.map(takenOrder => (
            <OrderItem
              key={takenOrder.loanOrderHash}
              bZx={bZx}
              accounts={accounts}
              tokens={tokens}
              takenOrder={takenOrder}
            />
          ))
        ) : (
          <p>You have no orders, try refreshing.</p>
        )}
      </div>
    );
  }
}
