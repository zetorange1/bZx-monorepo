import styled from "styled-components";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";

const Container = styled.div`
  display: flex;
  width: 100%;
  padding: 24px 0;
  justify-content: center;
  align-items: flex-start;
`;

const ProviderContainer = styled.div`
  width: 250px;
  text-align: center;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const ProviderItem = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  text-decoration: none;
`;

const ProviderIcon = styled.img`
  width: 130px;
`;

/* const ProviderLabel = styled.div`
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 12px;
`; */

export default class ChooseProviderDialog extends React.Component {
  handleChooseProvider = event => {
    event.preventDefault();
    // event.stopPropagation();
    this.props.setProvider(event.target.id);
  };

  render() {
    return (
      <Dialog open={this.props.open}>
        <DialogTitle>Choose Wallet Provider</DialogTitle>
        <DialogContent style={{ padding: `unset` }}>
          <Container>
            <ProviderContainer>
              <ProviderItem
                href=""
                id="MetaMask"
                onClick={this.handleChooseProvider}
              >
                <ProviderIcon
                  id="MetaMask"
                  style={{ marginTop: `-17.5px` }}
                  src="/static/metamask.png"
                />
              </ProviderItem>
              (Mainnet or Ropsten)
            </ProviderContainer>
            <ProviderContainer>
              <ProviderItem
                href=""
                id="Ledger"
                onClick={this.handleChooseProvider}
              >
                <ProviderIcon id="Ledger" src="/static/ledger.png" />
              </ProviderItem>
              (Ropsten only)
            </ProviderContainer>
            {/* <ProviderContainer>
              <ProviderItem href={``} id={`Trezor`} onClick={this.handleChooseProvider}>
                <ProviderIcon id={`Trezor`} src={`/static/trezor.png`} />
              </ProviderItem>
            </ProviderContainer> */}
          </Container>
        </DialogContent>
        <DialogActions>
          <Button onClick={this.props.close} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}
