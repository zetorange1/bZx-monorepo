import { Fragment } from "react";
import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  HeaderData,
  Content
} from "../src/common/MainContent";
import { Divider } from "../src/common/FormSection";
import PageContent from "../src/bounties";
import Web3Container from "../src/web3/Web3Container";
import NetworkIndicator from "../src/common/NetworkIndicator";

export default class Bounties extends React.Component {
  state = { activeTab: undefined };

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab } = this.state; // eslint-disable-line no-unused-vars
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Bounties</HeaderTitle>
            <HeaderData />
          </Header>
          <Content>
            <Web3Container
              render={({ web3, zeroEx, tokens, b0x, accounts, networkId }) => (
                <Fragment>
                  <NetworkIndicator
                    networkId={networkId}
                    accounts={accounts}
                    etherscanURL={b0x.etherscanURL}
                  />
                  <p>
                    This section will allow bounty hunters to liquidate loans
                    that have become unsafe. Unsafe loans are open loans where
                    the value of the collateral has fallen below the requisite
                    amount (i.e. the maintenance margin amount).
                  </p>
                  <Divider />
                  <PageContent
                    web3={web3}
                    zeroEx={zeroEx}
                    b0x={b0x}
                    accounts={accounts}
                    tokens={tokens}
                  />
                </Fragment>
              )}
            />
          </Content>
        </Card>
      </Layout>
    );
  }
}

// b0x, tokens, accounts, web3
