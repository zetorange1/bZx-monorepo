import styled from "styled-components";
import Dialog, {
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "material-ui/Dialog";
import Button from "material-ui/Button";
import { SHADOWS } from "../../styles/constants";

const Container = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const TokenButton = styled.div`
  cursor: pointer;
  box-shadow: ${SHADOWS.light};
  border-radius: 8px;
  width: 120px;
  height: 120px;

  display: flex;
  justify-content: center;
  align-items: center;
`;

export default class TokenPicker extends React.Component {
  state = { showDialog: false };
  toggleDialog = () => this.setState(p => ({ showDialog: !p.showDialog }));
  render() {
    // const { onChange, value } = this.props;
    return (
      <Container>
        <TokenButton onClick={this.toggleDialog}>Button</TokenButton>
        <Dialog
          open={this.state.showDialog}
          onClose={this.toggleDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {`Use Google's location service?`}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Let Google help apps determine location. This means sending
              anonymous location data to Google, even when no apps are running.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleDialog} color="primary">
              Disagree
            </Button>
            <Button onClick={this.toggleDialog} color="primary" autoFocus>
              Agree
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }
}
