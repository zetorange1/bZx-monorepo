import { Fragment } from "react";
import withRoot from "../lib/material-ui/withRoot";
import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  HeaderTitleNoProvider,
  HeaderTitleSiteName,
  HeaderTitleContext,
  HeaderData,
  TabGroup,
  Tab,
  Content,
  ContentContainer
} from "../src/common/MainContent";

import Balances from "../src/balances";

import GenerateOrder from "../src/orders/GenerateOrder";
import FillOrder from "../src/orders/FillOrder";
import OrderHistory from "../src/orders/OrderHistory";
import OrderBook from "../src/orders/OrderBook";

import Borrowing from "../src/borrowing";

import Lending from "../src/lending";

import Bounties from "../src/bounties";

import Web3Container from "../src/web3/Web3Container";
import NetworkIndicator from "../src/common/NetworkIndicator";
import { Divider } from "../src/common/FormSection";
import { getTrackedTokens } from "../src/common/trackedTokens";

const TABS = [
  { id: `Orders_GenOrder`, label: `Generate Order` },
  { id: `Orders_OrderBook`, label: `Order Book` },
  { id: `Orders_FillOrder`, label: `Fill Order` },
  { id: `Orders_OrderHistory`, label: `Order History` }
];

class Index extends React.Component {
  state = {
    activeCard: `Balances`,
    activeTab: `Orders_GenOrder`,
    activeOrder: null,
    trackedTokens: [],
    providerName: ``,
    getWeb3: false,
    web3IsReceived: false,
    hideChooseProviderDialog: false
  };

  setProvider = provider => {
    switch (provider) {
      case `MetaMask`:
      case `Ledger`:
        this.setState({
          providerName: provider,
          getWeb3: true,
          web3IsReceived: false
        });
        break;
      case `Trezor`:
      default:
        this.setState({
          providerName: ``,
          getWeb3: false,
          web3IsReceived: false
        });
        break;
    }
  };

  toggleProviderDialog = event => {
    event.preventDefault();
    this.setState(p => ({
      hideChooseProviderDialog: !p.hideChooseProviderDialog
    }));
  };

  changeCard = cardId => this.setState({ activeCard: cardId });
  changeTab = (tabId, order) =>
    this.setState({ activeTab: tabId, activeOrder: order });

  web3Received = () => this.setState({ getWeb3: false, web3IsReceived: true });

  clearProvider = () => {
    this.setProvider(null);
  };

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

  headerSection = cardId => {
    switch (cardId) {
      case `Balances`:
        return (
          <Fragment>
            <HeaderTitle>
              <HeaderTitleSiteName>bZx Portal</HeaderTitleSiteName>
              <HeaderTitleContext>Balances</HeaderTitleContext>
            </HeaderTitle>
            <HeaderData />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Orders`:
        return (
          <Fragment>
            <HeaderTitle>
              <HeaderTitleSiteName>bZx Portal</HeaderTitleSiteName>
              <HeaderTitleContext>Orders</HeaderTitleContext>
            </HeaderTitle>
            <HeaderData />
            <TabGroup>
              {TABS.map(tab => (
                <Tab
                  key={tab.id}
                  active={this.state.activeTab === tab.id}
                  onClick={() => this.changeTab(tab.id)}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabGroup>
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Borrowing`:
        return (
          <Fragment>
            <HeaderTitle>
              <HeaderTitleSiteName>bZx Portal</HeaderTitleSiteName>
              <HeaderTitleContext>Borrowing</HeaderTitleContext>
            </HeaderTitle>
            <HeaderData />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Lending`:
        return (
          <Fragment>
            <HeaderTitle>
              <HeaderTitleSiteName>bZx Portal</HeaderTitleSiteName>
              <HeaderTitleContext>Lending</HeaderTitleContext>
            </HeaderTitle>
            <HeaderData />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Bounties`:
        return (
          <Fragment>
            <HeaderTitle>
              <HeaderTitleSiteName>bZx Portal</HeaderTitleSiteName>
              <HeaderTitleContext>Bounties</HeaderTitleContext>
            </HeaderTitle>
            <HeaderData />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      default:
        break;
    }
    return null;
  };

  contentSection = (
    { web3, zeroEx, tokens, bZx, accounts, oracles, networkId },
    cardId
  ) => {
    switch (cardId) {
      case `Balances`:
        return (
          <Fragment>
            <NetworkIndicator
              networkId={networkId}
              accounts={accounts}
              etherscanURL={bZx.etherscanURL}
              providerName={this.state.providerName}
              clearProvider={this.clearProvider}
            />
            <Balances
              bZx={bZx}
              web3={web3}
              accounts={accounts}
              tokens={tokens}
              trackedTokens={this.state.trackedTokens}
              updateTrackedTokens={this.updateTrackedTokens(tokens)}
            />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Orders`:
        return (
          <Fragment>
            <NetworkIndicator
              networkId={networkId}
              accounts={accounts}
              etherscanURL={bZx.etherscanURL}
              providerName={this.state.providerName}
              clearProvider={this.clearProvider}
            />
            <ContentContainer
              show={this.state.activeTab === `Orders_OrderBook`}
            >
              <p>On-chain Fillable Orders</p>
              <Divider />
              <OrderBook
                bZx={bZx}
                accounts={accounts}
                tokens={tokens}
                changeTab={this.changeTab}
              />
            </ContentContainer>
            <ContentContainer show={this.state.activeTab === `Orders_GenOrder`}>
              <GenerateOrder
                tokens={tokens}
                bZx={bZx}
                accounts={accounts}
                web3={web3}
                oracles={oracles}
              />
            </ContentContainer>
            <ContentContainer
              show={this.state.activeTab === `Orders_FillOrder`}
            >
              <FillOrder
                tokens={tokens}
                oracles={oracles}
                bZx={bZx}
                web3={web3}
                accounts={accounts}
                activeOrder={this.state.activeOrder}
              />
            </ContentContainer>
            <ContentContainer
              show={this.state.activeTab === `Orders_OrderHistory`}
            >
              <OrderHistory bZx={bZx} accounts={accounts} tokens={tokens} />
            </ContentContainer>
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Borrowing`:
        return (
          <Fragment>
            <NetworkIndicator
              networkId={networkId}
              accounts={accounts}
              etherscanURL={bZx.etherscanURL}
              providerName={this.state.providerName}
              clearProvider={this.clearProvider}
            />
            <p>Manage your margin account positions.</p>
            <Divider />
            <Borrowing
              bZx={bZx}
              web3={web3}
              accounts={accounts}
              tokens={tokens}
              trackedTokens={this.state.trackedTokens}
              updateTrackedTokens={this.updateTrackedTokens(tokens)}
            />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Lending`:
        return (
          <Fragment>
            <NetworkIndicator
              networkId={networkId}
              accounts={accounts}
              etherscanURL={bZx.etherscanURL}
              providerName={this.state.providerName}
              clearProvider={this.clearProvider}
            />
            <p>Manage active loans and view past loans.</p>
            <Divider />
            <Lending
              web3={web3}
              zeroEx={zeroEx}
              bZx={bZx}
              accounts={accounts}
              tokens={tokens}
            />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      case `Bounties`:
        return (
          <Fragment>
            <NetworkIndicator
              networkId={networkId}
              accounts={accounts}
              etherscanURL={bZx.etherscanURL}
              providerName={this.state.providerName}
              clearProvider={this.clearProvider}
            />
            <p>
              Make margin calls and earn bounty rewards.<br />
              If a margin account is under margin maintenance, it needs to be
              liquidated.
            </p>
            <Divider />
            <Bounties
              web3={web3}
              zeroEx={zeroEx}
              bZx={bZx}
              accounts={accounts}
              tokens={tokens}
            />
          </Fragment>
        );
        break; // eslint-disable-line no-unreachable
      default:
        break;
    }
    return null;
  };

  render() {
    const {
      activeCard,
      // activeTab,
      // trackedTokens,
      providerName,
      getWeb3,
      web3IsReceived,
      hideChooseProviderDialog
    } = this.state;
    return (
      <Layout
        changeCard={this.changeCard}
        providerName={providerName}
        web3IsReceived={web3IsReceived}
      >
        <Card>
          <Header>
            {!web3IsReceived ? (
              <Fragment>
                <HeaderTitleNoProvider>
                  WELCOME TO THE bZx PORTAL
                </HeaderTitleNoProvider>
                <HeaderData />
              </Fragment>
            ) : (
              this.headerSection(activeCard)
            )}
          </Header>
          <Content
            style={
              !hideChooseProviderDialog && !web3IsReceived && !getWeb3
                ? { display: `none` }
                : {}
            }
          >
            <Web3Container
              // eslint-disable-next-line
              render={({ web3, zeroEx, tokens, bZx, accounts, oracles, networkId }) => this.contentSection({ providerName, web3, zeroEx, tokens, bZx, accounts, oracles, networkId },activeCard)}
              providerName={providerName}
              setProvider={this.setProvider}
              clearProvider={this.clearProvider}
              toggleProviderDialog={this.toggleProviderDialog}
              hideChooseProviderDialog={hideChooseProviderDialog}
              getWeb3={getWeb3}
              web3Received={this.web3Received}
            />
          </Content>
        </Card>
      </Layout>
    );
  }
}

export default withRoot(Index);
