import styled from "styled-components";
import { ZeroEx } from "0x.js";
import B0xJS from "b0x.js"; // eslint-disable-line
import getWeb3 from "./getWeb3";
import GetMetaMask from "./GetMetaMask";
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
    web3: null,
    zeroEx: null,
    tokens: null,
    b0x: null,
    accounts: null,
    oracles: null,
    networkId: null
  };

  async componentDidMount() {
    const web3 = await getWeb3();
    if (!web3) {
      this.setState({ loading: false });
      return;
    }
    const networkId = await getNetworkId(web3);
    const b0x = new B0xJS(web3.currentProvider, { networkId });
    const zeroEx = new ZeroEx(web3.currentProvider, {
      networkId,
      tokenRegistryContractAddress: b0x.addresses.TokenRegistry
    });

    // Get tokens from the token registry
    let tokens;
    try {
      tokens = await b0x.getTokenList();
    } catch (err) {
      alert(
        `You may be on the wrong network, please check MetaMask and refresh the page.`
      );
      console.error(err);
      return;
    }

    // Get accounts
    const accounts = await web3.eth.getAccounts();
    if (!accounts[0]) {
      alert(`Please unlock your MetaMask account, and then refresh the page.`);
      return;
    }

    // Get oracles
    let oracles;
    try {
      oracles = await b0x.getOracleList();
    } catch (err) {
      alert(
        `You may be on the wrong network, please check MetaMask and refresh the page.`
      );
      console.error(err);
      return;
    }

    this.setState({
      loading: false,
      web3,
      zeroEx,
      tokens,
      b0x,
      accounts,
      oracles,
      networkId
    });
  }

  render() {
    const {
      loading,
      web3,
      zeroEx,
      tokens,
      b0x,
      accounts,
      oracles,
      networkId
    } = this.state;
    const { render } = this.props;
    if (loading) {
      return <LoadingContainer>Loading Web3...</LoadingContainer>;
    }
    return web3 ? (
      render({ web3, zeroEx, tokens, b0x, accounts, oracles, networkId })
    ) : (
      <GetMetaMask />
    );
  }
}
