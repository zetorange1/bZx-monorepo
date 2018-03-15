import { Fragment } from "react";
import withRoot from "../lib/material-ui/withRoot";
import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  TabGroup,
  Tab,
  Content,
  ContentContainer
} from "../src/common/MainContent";
import GenerateOrder from "../src/orders/GenerateOrder";
import FillOrder from "../src/orders/FillOrder";
import Balances from "../src/orders/Balances";
import OrderHistory from "../src/orders/OrderHistory";
import Web3Container from "../src/web3/Web3Container";
import { getTrackedTokens } from "../src/common/trackedTokens";

const TABS = [
  { id: `GEN_ORDER`, label: `Generate Order` },
  { id: `FILL_ORDER`, label: `Fill Order` },
  { id: `BALANCES`, label: `Balances` },
  { id: `ORDER_HISTORY`, label: `Order History` }
];

class Orders extends React.Component {
  state = { activeTab: `GEN_ORDER`, trackedTokens: [] };

  componentDidMount = () => this.updateTrackedTokens();

  updateTrackedTokens = () =>
    this.setState({ trackedTokens: getTrackedTokens() });

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab, trackedTokens } = this.state;
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Orders</HeaderTitle>
            <TabGroup>
              {TABS.map(tab => (
                <Tab
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => this.changeTab(tab.id)}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabGroup>
          </Header>
          <Content>
            <Web3Container
              // eslint-disable-next-line
              render={({ web3, zeroEx, tokens, b0x, accounts, oracles }) => (
                <Fragment>
                  <ContentContainer show={activeTab === `GEN_ORDER`}>
                    <GenerateOrder
                      tokens={tokens}
                      b0x={b0x}
                      accounts={accounts}
                      web3={web3}
                      oracles={oracles}
                    />
                  </ContentContainer>
                  <ContentContainer show={activeTab === `FILL_ORDER`}>
                    <FillOrder tokens={tokens} />
                  </ContentContainer>
                  <ContentContainer show={activeTab === `BALANCES`}>
                    <Balances
                      b0x={b0x}
                      web3={web3}
                      accounts={accounts}
                      tokens={tokens}
                      trackedTokens={trackedTokens}
                      updateTrackedTokens={this.updateTrackedTokens}
                    />
                  </ContentContainer>
                  <ContentContainer show={activeTab === `ORDER_HISTORY`}>
                    <OrderHistory />
                  </ContentContainer>
                </Fragment>
              )}
            />
          </Content>
        </Card>
      </Layout>
    );
  }
}

export default withRoot(Orders);
