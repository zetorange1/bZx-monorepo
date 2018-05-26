import { Fragment } from "react";
import withRoot from "../lib/material-ui/withRoot";
import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  HeaderData,
  TabGroup,
  Tab,
  Content,
  ContentContainer
} from "../src/common/MainContent";
import GenerateOrder from "../src/orders/GenerateOrder";
import FillOrder from "../src/orders/FillOrder";
import OrderHistory from "../src/orders/OrderHistory";
import Web3Container from "../src/web3/Web3Container";
import NetworkIndicator from "../src/common/NetworkIndicator";

const TABS = [
  { id: `GEN_ORDER`, label: `Generate Order` },
  { id: `FILL_ORDER`, label: `Fill Order` },
  { id: `ORDER_HISTORY`, label: `Order History` }
];

class Orders extends React.Component {
  state = { activeTab: `GEN_ORDER` };

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab } = this.state;
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Orders</HeaderTitle>
            <HeaderData />
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
              render={({ web3, zeroEx, tokens, b0x, accounts, oracles, networkId }) => (
                <Fragment>
                  <NetworkIndicator
                    networkId={networkId}
                    accounts={accounts}
                    etherscanURL={b0x.etherscanURL}
                  />
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
                    <FillOrder
                      tokens={tokens}
                      oracles={oracles}
                      b0x={b0x}
                      accounts={accounts}
                    />
                  </ContentContainer>
                  <ContentContainer show={activeTab === `ORDER_HISTORY`}>
                    <OrderHistory
                      b0x={b0x}
                      accounts={accounts}
                      tokens={tokens}
                    />
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
