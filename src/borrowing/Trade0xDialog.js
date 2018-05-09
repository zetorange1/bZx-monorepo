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

export default class Trade0xDialog extends React.Component {
  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Execute Trade with 0x Order</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Paste in your 0x order</SectionLabel>
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Approve the token</SectionLabel>
          </Section>
          <Divider />
          <Section>
            <SectionLabel>3. Execute the change</SectionLabel>
            <p>Explanation here.</p>
            <Button variant="raised" color="primary">
              Execute trade
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
