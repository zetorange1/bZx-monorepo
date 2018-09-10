import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import OrderItem from "./OrderItem";
import BZxComponent from "../../common/BZxComponent";

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

export default class OrderBook extends BZxComponent {
  state = { orders: [], loading: false, error: false, count: 10 };

  componentDidMount() {
    this.getOrdersFillable();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.tabId === `Orders_OrderBook` &&
      this.props.tabId !== prevProps.tabId
    )
      this.getOrdersFillable();
  }

  getOrdersFillable = async () => {
    const { bZx } = this.props;
    this.setState({ loading: true });
    try {
      const orders = await this.wrapAndRun(bZx.getOrdersFillable({
        start: 0,
        count: this.state.count
      }));
      console.log(orders);
      this.setState({ orders, loading: false, error: false });
    } catch(e) {
      console.log(e);
      this.setState({ error: true, loading: false, orders: [] });
    }
  };

  increaseCount = () => {
    this.setState(
      prev => ({
        count: prev.count + 10
      }),
      this.getOrdersFillable
    );
  };

  render() {
    const { bZx, accounts, tokens, changeTab } = this.props;
    const { orders, loading, error, count } = this.state;
    if (error) {
      return (
        <div>
          <InfoContainer>
            <ShowCount>Web3 error loading loan orders. Please refresh in a few minutes.</ShowCount>
            <Button onClick={this.getOrdersFillable} variant="raised" disabled={false}>
              Refresh
            </Button>
          </InfoContainer>
        </div>
      );
    } else if (orders.length === 0) {
      return (
        <div>
          <InfoContainer>
            <ShowCount>No loan orders found.</ShowCount>
            <Button
              onClick={this.getOrdersFillable}
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
            onClick={this.getOrdersFillable}
            variant="raised"
            disabled={loading}
          >
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>
        <br />
        {orders.length > 0 ? (
          orders.map(fillableOrder => {
            fillableOrder.networkId = bZx.networkId; // eslint-disable-line no-param-reassign
            fillableOrder.makerRole = // eslint-disable-line no-param-reassign
              fillableOrder.collateralTokenAddress ===
              `0x0000000000000000000000000000000000000000`
                ? `0`
                : `1`;
            // console.log(bZx);
            // if (fillableOrder.makerAddress !== accounts[0].toLowerCase())
            return (
              <OrderItem
                key={fillableOrder.loanOrderHash}
                bZx={bZx}
                accounts={accounts}
                tokens={tokens}
                fillableOrder={fillableOrder}
                changeTab={changeTab}
              />
            );
          })
        ) : (
          <p>No loan orders found, try refreshing.</p>
        )}
      </div>
    );
  }
}
