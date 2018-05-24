import styled from "styled-components";
import Section, { SectionLabel } from "../common/FormSection";

const Container = styled.div`
  width: 100%;
  text-align: left;
`;

const StyledDiv = styled.div`
  margin: 0;
  display: block;
  color: rgba(0, 0, 0, 0.87);
  font-size: 0.875rem;
  font-weight: 400;
  font-family: "Raleway", sans-serif;
  line-height: 1.46429em;
  margin-bottom: 0.35em;
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
            <StyledDiv>
              Your current Ether balance is{` `}
              <strong>{this.state.ethBalance.toString()} ETH</strong>.
            </StyledDiv>
          ) : (
            <StyledDiv>
              Your current Ether balance is <strong>loading...</strong>.
            </StyledDiv>
          )}
          <StyledDiv>
            But instead of ETH, you will need{` `}
            <a
              href="https://weth.io/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Wrapped Ether (WETH)
            </a>
            {` `}
            to trade on b0x.
          </StyledDiv>
          <StyledDiv>
            In order to wrap your ETH, you can make use of the 0x Portal {` `}
            <a
              href="https://0xproject.com/portal/weth"
              target="_blank"
              rel="noreferrer noopener"
            >
              ETH wrapper
            </a>.
          </StyledDiv>
        </Container>
      </Section>
    );
  }
}
