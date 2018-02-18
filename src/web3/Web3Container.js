import styled from "styled-components";
import { ZeroEx } from "0x.js";
import B0xJS from "b0x.js"; // eslint-disable-line
import getWeb3 from "./getWeb3";
import GetMetaMask from "./GetMetaMask";

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
    accounts: null
  };

  async componentDidMount() {
    const web3 = await getWeb3();
    const zeroEx = new ZeroEx(web3.currentProvider, {
      networkId: 1,
      tokenRegistryContractAddress: `0x0b1ba0af832d7c05fd64161e0db78e85978e8082`
    });
    const tokens = await zeroEx.tokenRegistry.getTokensAsync();
    const b0x = new B0xJS(web3.currentProvider);
    const accounts = await web3.eth.getAccounts();
    this.setState({ loading: false, web3, zeroEx, tokens, b0x, accounts });
  }

  render() {
    const { loading, web3, zeroEx, tokens, b0x, accounts } = this.state;
    const { render } = this.props;
    if (loading) {
      return <LoadingContainer>Loading Web3...</LoadingContainer>;
    }
    return web3 ? (
      render({ web3, zeroEx, tokens, b0x, accounts })
    ) : (
      <GetMetaMask />
    );
  }
}
