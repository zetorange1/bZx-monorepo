import styled from "styled-components";
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
  state = { loading: true, web3: null };

  async componentDidMount() {
    const web3 = await getWeb3();
    this.setState({ loading: false, web3 });
  }

  render() {
    const { loading, web3 } = this.state;
    const { render } = this.props;
    if (loading) {
      return <LoadingContainer>Loading Web3...</LoadingContainer>;
    }
    return web3 ? render({ web3 }) : <GetMetaMask />;
  }
}
