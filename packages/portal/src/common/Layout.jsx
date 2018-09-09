import styled from "styled-components";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Nav from "./Nav";
// import Footer from "./Footer";
import { DIMENSIONS } from "../styles/constants";
import { toBigNumber } from "./utils";

const Container = styled.div`
  /* make it full height and width */
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  /* layout: nav, content, and footer */
  display: grid;
  grid-template-rows: auto 1fr auto;
`;

const Content = styled.div`
  /* center the inner container */
  display: flex;
  justify-content: center;

  /* deal with fixed navbar on mobile */
  @media screen and (max-width: 600px) {
    margin-top: ${DIMENSIONS.mobileNavHeight};
  }
`;

const ContentContainer = styled.div`
  /* as wide as it can be, but not too wide */
  width: 100%;
  max-width: ${DIMENSIONS.maxWidth};
`;

export default class Layout extends React.Component {
  state = { showAlertDialog: false, alertText: ``, alertComponent: null };

  componentDidMount = () => {
    alert = (text, opts) => {
      if (text) {
        this.showAlert(text, opts && opts.component);
      } else {
        this.hideAlert();
      }
    };
    window.gasValue = gasEstimate => {
      const buffer = 0.1;
      const newValue = Math.round(gasEstimate + gasEstimate * buffer);
      console.log(newValue);
      return newValue;
    };
    window.tokenSymbols = {};
    window.tokenDecimals = {};
    window.defaultGasPrice = toBigNumber(5, 1E9);
  };

  showAlert = (text, alertComponent = null) => {
    this.setState({ alertText: text, showAlertDialog: true, alertComponent });
    const extraText = (alertComponent && alertComponent().props.href) || ``;
    console.log(`${text} ${extraText}`);
  };

  hideAlert = () => this.setState({ showAlertDialog: false });

  render() {
    const AlertComponent = this.state.alertComponent;
    return (
      <Container>
        <Nav 
          { ...this.props }
          gasAmount={this.state.gasAmount}
          setGasAmount={this.setGasAmount}
        />
        <Content>
          <ContentContainer>{this.props.children}</ContentContainer>
        </Content>
        {/* <Footer /> */}
        <Dialog open={this.state.showAlertDialog}>
          <DialogTitle>Alert</DialogTitle>
          <DialogContent>
            <DialogContentText>{this.state.alertText}</DialogContentText>
            {AlertComponent && <AlertComponent />}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.hideAlert} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }
}
