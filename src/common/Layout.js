import styled from "styled-components";
import Button from "material-ui/Button";
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "material-ui/Dialog";
import Nav from "./Nav";
// import Footer from "./Footer";
import { DIMENSIONS } from "../styles/constants";

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
  };

  showAlert = (text, alertComponent = null) => {
    this.setState({ alertText: text, showAlertDialog: true, alertComponent });
    console.log(text);
  };

  hideAlert = () => this.setState({ showAlertDialog: false });

  render() {
    const AlertComponent = this.state.alertComponent;
    return (
      <Container>
        {Nav(this.props.changeCard)}
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
