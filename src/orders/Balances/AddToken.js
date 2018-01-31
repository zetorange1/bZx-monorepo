import styled from "styled-components";
// import Typography from "material-ui/Typography";
import Button from "material-ui/Button";
import Section, { SectionLabel } from "../../common/FormSection";
import TokenPicker from "../../common/TokenPicker";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  & > *:first-child {
    margin-bottom: 12px;
  }
`;

export default class AddToken extends React.Component {
  state = { tokenAddress: this.props.tokens[0].address };

  setTokenAddress = addr => this.setState({ tokenAddress: addr });

  render() {
    const { tokens } = this.props;
    return (
      <Section>
        <SectionLabel>Add new tracked token</SectionLabel>
        <Container>
          <TokenPicker
            tokens={tokens}
            setAddress={this.setTokenAddress}
            value={this.state.tokenAddress}
          />
          <Button raised color="primary">
            Add Token
          </Button>
        </Container>
      </Section>
    );
  }
}
