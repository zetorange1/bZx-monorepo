import styled from "styled-components";
import Dialog, { DialogTitle, DialogActions } from "material-ui/Dialog";
import Button from "material-ui/Button";
import { SHADOWS } from "../styles/constants";
import { getIconURL } from "./tokens";

const Container = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const TokenButton = styled.div`
  width: 120px;
  height: 120px;
  box-sizing: border-box;

  box-shadow: ${SHADOWS.light};
  padding: 24px 12px;
  border-radius: 6px;
  cursor: pointer;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const DialogContent = styled.div`
  flex: 1 1 auto;
  padding: 24px;
  overflow-y: auto;

  display: grid;
  justify-content: center;
  grid-gap: 24px;
  grid-template-columns: 120px 120px 120px 120px;
  grid-auto-rows: 120px;

  @media screen and (max-width: 900px) {
    grid-template-columns: 120px 120px 120px;
  }

  @media screen and (max-width: 600px) {
    grid-template-columns: 120px 120px;
  }

  @media screen and (max-width: 400px) {
    grid-template-columns: 120px;
  }
`;

const Coin = styled.div`
  padding: 24px 12px;
  border-radius: 6px;
  cursor: pointer;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  color: ${p => (p.active ? `black` : `unset`)};
  background: ${p => (p.active ? `rgba(0,0,0,0.1)` : `unset`)};

  &:hover {
    box-shadow: ${SHADOWS.light};
  }
`;

const CoinIcon = styled.img`
  width: 32px;
  margin-top: 6px;
`;

const CoinLabel = styled.div`
  text-align: center;
  margin-top: 12px;

  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 12px;
`;

export default class TokenPicker extends React.Component {
  state = { showDialog: false };

  toggleDialog = () => this.setState(p => ({ showDialog: !p.showDialog }));

  selectToken = address => () => {
    this.props.setAddress(address);
    this.toggleDialog();
  };

  render() {
    const { value, tokens } = this.props;
    const { showDialog } = this.state;
    if (!tokens) {
      return null;
    }
    const selectedToken = tokens.filter(t => t.address === value)[0];
    return (
      <Container>
        <TokenButton onClick={this.toggleDialog}>
          <CoinIcon src={getIconURL(selectedToken)} />
          <CoinLabel>{selectedToken.name}</CoinLabel>
        </TokenButton>
        <Dialog open={showDialog} onClose={this.toggleDialog}>
          <DialogTitle id="alert-dialog-title">Select Token</DialogTitle>
          <DialogContent>
            {tokens.map(t => (
              <Coin
                key={t.symbol}
                active={value === t.address}
                onClick={this.selectToken(t.address)}
              >
                <CoinIcon src={getIconURL(t)} />
                <CoinLabel>{t.name}</CoinLabel>
              </Coin>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }
}
