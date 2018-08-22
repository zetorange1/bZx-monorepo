/* global window */
import { Fragment } from "react";
import styled from "styled-components";
import Typography from "@material-ui/core/Typography";
import MuiButton from "@material-ui/core/Button";
import queryString from "querystring";
import { SectionLabel } from "../../common/FormSection";
import FillOrderPage from "./FillOrder";
import { getOrderHash } from "./utils";

const TextArea = styled.textarea`
  margin: 12px 0;
  width: 100%;
  max-width: 480px;
  font-family: monospace;
`;

const BackLink = styled(Typography)`
  display: inline-block !important;
  margin-bottom: 12px !important;
  text-decoration: underline;
  cursor: pointer;
`;

const Button = styled(MuiButton)`
  display: block !important;
`;

export default class FillOrder extends React.Component {
  state = {
    value: ``,
    showOrderInfo: false
  };

  componentDidMount() {
    const params = queryString.parse(window.location.search);
    if (params.order !== undefined && params.order !== ``) {
      this.setState({ value: params.order });
      this.checkOrder();
    }
  }

  checkOrder = () => {
    try {
      const JSONOrder = JSON.parse(this.state.value);
      const hex = getOrderHash(JSONOrder);
      if (hex) {
        this.setState({ showOrderInfo: true });
      } else {
        alert(`The JSON order is not valid. Please verify what you entered.`);
      }
    } catch (e) {
      alert(`The JSON order is not valid. Please verify what you entered.`);
    }
  };

  reset = () => this.setState({ showOrderInfo: false });

  handleChange = e => this.setState({ value: e.target.value });

  render() {
    const { showOrderInfo, value } = this.state;
    if (showOrderInfo || this.props.activeOrder) {
      return (
        <Fragment>
          {!this.props.activeOrder ? (
            <BackLink onClick={this.reset}>Go Back</BackLink>
          ) : (
            ``
          )}
          <FillOrderPage
            order={
              this.props.activeOrder
                ? this.props.activeOrder
                : JSON.parse(value)
            }
            tokens={this.props.tokens}
            oracles={this.props.oracles}
            web3={this.props.web3}
            bZx={this.props.bZx}
            accounts={this.props.accounts}
            changeTab={this.props.changeTab}
            resetOrder={this.reset}
          />
        </Fragment>
      );
    }
    return (
      <div>
        <SectionLabel>Fill an order</SectionLabel>
        <Typography>Paste your JSON order below:</Typography>
        <TextArea
          cols="30"
          rows="10"
          value={value}
          onChange={this.handleChange}
        />
        <Button variant="raised" color="primary" onClick={this.checkOrder}>
          Get Order Info
        </Button>
      </div>
    );
  }
}
