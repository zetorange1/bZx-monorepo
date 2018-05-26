import { Fragment } from "react";
import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  HeaderData,
  Content
} from "../src/common/MainContent";
import packageJson from "../package.json";
import PageContent from "../src/balances";
import Web3Container from "../src/web3/Web3Container";
import NetworkIndicator from "../src/common/NetworkIndicator";
import { getTrackedTokens } from "../src/common/trackedTokens";

export default class Balances extends React.Component {
  state = { activeTab: undefined, trackedTokens: [] };

  changeTab = tabId => this.setState({ activeTab: tabId });

  updateTrackedTokens = tokens => hardRefresh => {
    if (hardRefresh) {
      this.setState({ trackedTokens: [] }, () =>
        this.setState({
          trackedTokens: getTrackedTokens(tokens)
        })
      );
    } else {
      this.setState({
        trackedTokens: getTrackedTokens(tokens)
      });
    }
  };

  render() {
    const { activeTab, trackedTokens } = this.state; // eslint-disable-line no-unused-vars
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Balances</HeaderTitle>
            <HeaderData>
              <div className="network-name">Kovan</div>
              <div className="network-address">0x1234...1234</div>
              <div className="portal-version">Alpha v{packageJson.version}</div>
            </HeaderData>
          </Header>
          <Content>
            <Web3Container
              render={({ web3, tokens, b0x, accounts, networkId }) => (
                <Fragment>
                  <NetworkIndicator
                    networkId={networkId}
                    accounts={accounts}
                    etherscanURL={b0x.etherscanURL}
                  />
                  <PageContent
                    b0x={b0x}
                    web3={web3}
                    accounts={accounts}
                    tokens={tokens}
                    trackedTokens={trackedTokens}
                    updateTrackedTokens={this.updateTrackedTokens(tokens)}
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
