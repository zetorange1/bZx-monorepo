/* globals document */
import { Fragment } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import packageJson from "../../package.json";
import { 
  Button,
  Input,
  InputLabel,
  InputAdornment,
  FormControl,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@material-ui/core";

import { fromBigNumber, toBigNumber } from "./utils";

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  color: white;
  display: inline-block;
  margin-bottom: 3px;
  text-decoration: none;
`;

const ChangeButton = styled.a.attrs({
  rel: `noopener noreferrer`
})`
  text-decoration: none;
`;

const ChangeButtonLabel = styled.div`
  margin-top: 6px;
  margin-left: 6px;
  color: white;
  padding: 0;
  font-size: 9px;
`;

const networks = {
  1: { name: `Main Net`, color: `#038789` },
  3: { name: `Ropsten Testnet`, color: `#E91550` },
  4: { name: `Rinkeby Testnet`, color: `#EBB33F` },
  42: { name: `Kovan Testnet`, color: `#690496` }
};

const currentAccount = addr => `${addr.substr(0, 8)} ... ${addr.substr(-6)}`;

export default class NetworkIndicator extends React.Component {
  state = {
    showGasDialog: false,
    gasPrice: fromBigNumber(window.defaultGasPrice, 1E9)
  }

  handleClearProvider = event => {
    event.preventDefault();
    this.props.clearProvider();
  }

  setGasPrice = e => {
    let value = e.target.value;
    if (!value)
      value = 0;
    this.setState({ gasPrice: value });
  }
  
  toggleGasDialog = event => {
    event.preventDefault();
    if (this.state.showGasDialog)
      window.defaultGasPrice = toBigNumber(this.state.gasPrice, 1E9);
    this.setState(p => ({ showGasDialog: !p.showGasDialog }));
  }

  nameExists = networks.hasOwnProperty(this.props.networkId);
  domNode = document.getElementsByClassName(`network-indicator`)[0];

  addressLink = `${this.props.etherscanURL}address/${this.props.accounts[0]}`;
  addressText = currentAccount(this.props.accounts[0]);

  render() {
    const ToRender = (
      <Fragment>
        <div className="portal-version">Version Alpha {packageJson.version}</div>
        {this.nameExists ? (
          <div className="network-name">{networks[this.props.networkId].name}</div>
        ) : (
          <div className="network">Private Network {this.props.networkId}</div>
        )}
        <AddressLink href={this.addressLink}>{this.addressText}</AddressLink>
        {this.props.providerName && (
          <Fragment>
            <div>
              <div style={{ marginBottom: `3px`, display: `inline-flex` }}>
                Using {this.props.providerName}
                <ChangeButton href="" onClick={this.handleClearProvider}>
                  <ChangeButtonLabel>Change</ChangeButtonLabel>
                </ChangeButton>
              </div>
              <br/>
              <div style={{ display: `inline-flex` }}>
                Gas Price: {fromBigNumber(window.defaultGasPrice, 1E9)} GWEI
                <ChangeButton href="" onClick={this.toggleGasDialog}>
                  <ChangeButtonLabel>Change</ChangeButtonLabel>
                </ChangeButton>
              </div>
            </div>
          </Fragment>
        )}
        <Dialog
          open={this.state.showGasDialog}
          onClose={this.toggleGasDialog}
        >
          <DialogTitle>Gas Price</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This sets the gas price that will be used for transactions. If you are using Metamask, 
              you can override this value there.
            </DialogContentText>
            <FormControl fullWidth>
              <InputLabel>Gas Price</InputLabel>
              <Input
                value={this.state.gasPrice}
                type="number"
                onChange={this.setGasPrice}
                endAdornment={
                  <InputAdornment position="end">GWEI</InputAdornment>
                }
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleGasDialog} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Fragment>
    );
    return ReactDOM.createPortal(ToRender, this.domNode);
  }
}

