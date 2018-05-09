/* eslint-disable */

import styled from "styled-components";
import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Button from "material-ui/Button";
import Section, { SectionLabel, Divider } from "../common/FormSection";

// const TxHashLink = styled.a.attrs({
//   target: `_blank`,
//   rel: `noopener noreferrer`
// })`
//   font-family: monospace;
//   display: block;
//   text-overflow: ellipsis;
//   overflow: auto;
// }
// `;

const TextArea = styled.textarea`
  margin: 12px 0;
  width: 480px;
  max-width: 100%;
  font-family: monospace;
`;

export default class Trade0xDialog extends React.Component {
  state = { value: `` };

  handleChange = e => this.setState({ value: e.target.value });

  executeTrade = async () => {
    const { value } = this.state;
    const order0x = JSON.parse(value);
    console.log(order0x);
  };

  render() {
    const { value } = this.state;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Execute Trade with 0x Order</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Paste in your 0x order</SectionLabel>
            <TextArea
              cols="30"
              rows="10"
              value={value}
              onChange={this.handleChange}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Execute the trade</SectionLabel>
            <p>
              This function is for the user to present a pre-existing 0x order
              found elsewhere to b0x, so b0x can be the taker on behalf of the
              user.
            </p>
            <Button onClick={this.executeTrade} variant="raised" color="primary">
              Execute trade
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
