import styled from "styled-components";
import { ZeroEx } from "0x.js";
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
  state = { loading: true, web3: null, zeroEx: null };

  async componentDidMount() {
    const web3 = await getWeb3();
    const zeroEx = new ZeroEx(web3.currentProvider, { networkId: 1 });
    this.setState({ loading: false, web3, zeroEx });
  }

  render() {
    const { loading, web3, zeroEx } = this.state;
    const { render } = this.props;
    if (loading) {
      return <LoadingContainer>Loading Web3...</LoadingContainer>;
    }
    return web3 ? render({ web3, zeroEx }) : <GetMetaMask />;
  }
}
