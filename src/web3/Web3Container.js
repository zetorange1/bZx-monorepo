// /* global window */
import styled from "styled-components";
import { ZeroEx } from "0x.js";
import B0xJS from "b0x.js"; // eslint-disable-line
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

export default class Web3Container extends React.Component {
  state = {
    loading: true,
    errorMsg: ``,
    web3: null,
    zeroEx: null,
    tokens: null,
    b0x: null,
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
          errorMsg: `You may be on the wrong network. Please check that MetaMask is set to Ropsten Test Network.`
        });
      } else {
        this.setState({
          web3: null,
          loading: false,
          errorMsg: `You may be on the wrong network. Please refresh your browser and try again.`
        });
      }
    };

    const b0x = new B0xJS(web3.currentProvider, { networkId });
    b0x.portalProviderName = providerName; // setting custom field

    const zeroEx = new ZeroEx(web3.currentProvider, {
      networkId,
      tokenRegistryContractAddress: b0x.addresses.TokenRegistry
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
            errorMsg: `Please unlock your MetaMask account.`
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
      oracles = await b0x.getOracleList();
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
      tokens = await b0x.getTokenList();
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
      b0x,
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
      b0x,
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
      render({ web3, zeroEx, tokens, b0x, accounts, oracles, networkId })
    ) : (
      <NoProviderMessage
        providerName={providerName}
        clearProvider={clearProvider}
      />
    );
  }
}
