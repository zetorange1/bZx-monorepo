// /* global window */
import { Fragment } from "react";
import styled from "styled-components";
import { ZeroEx } from "0x.js";
import BZxJS from "b0x.js"; // eslint-disable-line
import ChooseProviderDialog from "./ChooseProviderDialog";
import getWeb3 from "./getWeb3";
import NoProviderMessage from "./NoProviderMessage";
import getNetworkId from "./getNetworkId";

const LoadingContainer = styled.div`
  background: white;
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;
  jsutify-content: center;
  align-items; center;
`;

const CancelButton = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  text-decoration: none;
  display: inherit;
`;

const CancelButtonLabel = styled.div`
  color: red;
`;

export default class Web3Container extends React.Component {
  state = {
    loading: true,
    errorMsg: ``,
    web3: null,
    zeroEx: null,
    tokens: null,
    bZx: null,
    accounts: null,
    oracles: null,
    networkId: null
  };

  async componentWillReceiveProps(nextProps) {
    if (nextProps.getWeb3) {
      this.setState({ loading: true, errorMsg: `` });
      await this.loadWeb3(nextProps.providerName);
    }
  }

  handleClearProvider = event => {
    event.preventDefault();
    this.props.clearProvider();
  };

  loadWeb3 = async providerName => {
    const web3 = await getWeb3(providerName);

    if (!web3) {
      this.setState({ web3: null, loading: false, errorMsg: `` });
      return;
    }

    const networkId = await getNetworkId(web3);

    // Known networks we actively support should be set here.
    // Currently only Ropsten is supported.
    const activeNetworkIds = {
      3: `Ropsten Test Network`
    };

    const displayNetworkError = () => {
      if (activeNetworkIds[networkId]) {
        this.setState({
          web3: null,
          loading: false,
          errorMsg: `We are temporarily unable to connect to ${
            activeNetworkIds[networkId]
          }. Please try again later.`
        });
      } else if (providerName === `MetaMask`) {
        this.setState({
          web3: null,
          loading: false,
          errorMsg: (
            <Fragment>
              <div>
                You may be on the wrong network. Please check that MetaMask is
                set to Main Ethereum Network or Ropsten Test Network.<br />
                <br />
                <div style={{ display: `inline-block` }}>
                  You can also{` `}
                  <CancelButton href="" onClick={this.handleClearProvider}>
                    <CancelButtonLabel>choose</CancelButtonLabel>
                  </CancelButton>
                  {` `}a different provider.
                </div>
              </div>
            </Fragment>
          )
        });
      } else {
        this.setState({
          web3: null,
          loading: false,
          errorMsg: `You may be on the wrong network. Please refresh your browser and try again.`
        });
      }
    };

    const bZx = new BZxJS(web3.currentProvider, { networkId });
    bZx.portalProviderName = providerName; // setting custom field

    const zeroEx = new ZeroEx(web3.currentProvider, {
      networkId,
      tokenRegistryContractAddress: bZx.addresses.TokenRegistry
    });

    // Get accounts
    let accounts;
    try {
      accounts = await web3.eth.getAccounts();
      if (!accounts[0]) {
        if (providerName === `MetaMask`) {
          this.setState({
            web3: null,
            loading: false,
            errorMsg: (
              <Fragment>
                <div>
                  Please unlock your MetaMask account.<br />
                  <br />
                  <div style={{ display: `inline-block` }}>
                    You can also{` `}
                    <CancelButton href="" onClick={this.handleClearProvider}>
                      <CancelButtonLabel>choose</CancelButtonLabel>
                    </CancelButton>
                    {` `}a different provider.
                  </div>
                </div>
              </Fragment>
            )
          });
          const interval = setInterval(async () => {
            if ((await web3.eth.getAccounts())[0]) {
              // window.location.reload();
              this.setState({ web3: null, loading: true, errorMsg: `` });
              this.loadWeb3(providerName);
              clearInterval(interval);
            }
          }, 500);
        } else {
          this.setState({
            web3: null,
            loading: false,
            errorMsg: `We are having trouble accessing your account. Please refresh your browser and try again.`
          });
        }

        return;
      }
      console.log(`Accounts: ${accounts}`);
    } catch (e) {
      console.log(e);
      this.setState({ web3: null, loading: false, errorMsg: `` });
      return;
    }

    if (providerName === `MetaMask`) {
      // Watch for account change
      const account = accounts[0];
      const interval = setInterval(async () => {
        if ((await web3.eth.getAccounts())[0] !== account) {
          // window.location.reload();
          this.setState({ web3: null, loading: true, errorMsg: `` });
          this.loadWeb3(providerName);
          clearInterval(interval);
        }
      }, 500);
    }

    // Get oracles
    let oracles;
    try {
      oracles = await bZx.getOracleList();
      if (oracles.length === 0) {
        displayNetworkError();
        return;
      }
    } catch (err) {
      console.error(err);
      displayNetworkError();
      return;
    }

    // Get tokens from the token registry
    let tokens;
    try {
      tokens = await bZx.getTokenList();
      if (tokens.length === 0) {
        displayNetworkError();
        return;
      }
    } catch (err) {
      console.error(err);
      displayNetworkError();
      return;
    }

    this.props.web3Received();

    this.setState({
      loading: false,
      errorMsg: ``,
      web3,
      zeroEx,
      tokens,
      bZx,
      accounts,
      oracles,
      networkId
    });
  };

  render() {
    const {
      loading,
      errorMsg,
      web3,
      zeroEx,
      tokens,
      bZx,
      accounts,
      oracles,
      networkId
    } = this.state;
    const {
      render,
      providerName,
      setProvider,
      clearProvider,
      toggleProviderDialog,
      hideChooseProviderDialog
    } = this.props;
    if (!providerName) {
      if (hideChooseProviderDialog) {
        return (
          <LoadingContainer style={{ display: `inline-block` }}>
            Please{` `}
            <a
              style={{ textDecoration: `none`, display: `inherit` }}
              href=""
              onClick={toggleProviderDialog}
            >
              <div style={{ color: `red` }}>choose</div>
            </a>
            {` `}a Web3 provider.
          </LoadingContainer>
        );
      }
      return (
        <ChooseProviderDialog
          open
          close={toggleProviderDialog}
          setProvider={setProvider}
        />
      );
    }
    if (loading) {
      return (
        <LoadingContainer>Connecting to {providerName}...</LoadingContainer>
      );
    } else if (errorMsg) {
      return <LoadingContainer>{errorMsg}</LoadingContainer>;
    }
    return web3 ? (
      render({ web3, zeroEx, tokens, bZx, accounts, oracles, networkId })
    ) : (
      <NoProviderMessage
        providerName={providerName}
        clearProvider={clearProvider}
      />
    );
  }
}
