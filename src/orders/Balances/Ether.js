import styled from "styled-components";
import Typography from "material-ui/Typography";
import Section, { SectionLabel } from "../../common/FormSection";

const Container = styled.div`
  width: 100%;
  text-align: left;
`;

export default class Ether extends React.Component {
  state = { ethBalance: null };

  async componentDidMount() {
    const { web3, accounts } = this.props;
    const balanceInWei = await web3.eth.getBalance(accounts[0]);
    this.setState({ ethBalance: balanceInWei / 1e18 });
  }

  render() {
    const showEthBalance = this.state.ethBalance !== null;
    return (
      <Section>
        <SectionLabel>Ether</SectionLabel>
        <Container>
          {showEthBalance ? (
            <Typography gutterBottom>
              Your current Ether balance is{` `}
              <strong>{this.state.ethBalance.toString()} ETH</strong>.
            </Typography>
          ) : (
            <Typography gutterBottom>
              Your current Ether balance is <strong>loading...</strong>.
            </Typography>
          )}
          <Typography gutterBottom>
            But instead of ETH, you will need{` `}
            <a
              href="https://weth.io/"
              target="_blank"
              rel="noreferrer noopener"
            >
              wrapped Ether (WETH)
            </a>
            {` `}
            to trade on b0x.
          </Typography>
          <Typography gutterBottom>
            In order to wrap your ETH, you can make use of the 0x Portal {` `}
            <a
              href="https://0xproject.com/portal/weth"
              target="_blank"
              rel="noreferrer noopener"
            >
              ETH wrapper
            </a>.
          </Typography>
        </Container>
      </Section>
    );
  }
}
