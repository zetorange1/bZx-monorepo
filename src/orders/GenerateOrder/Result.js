/* eslint-disable react/no-unknown-property, no-return-assign */
import { Fragment } from "react";
import styled from "styled-components";
import { COLORS } from "../../styles/constants";

const HashDiv = styled.div`
  margin-top: 24px;
  text-align: center;
  margin-bottom: 24px;
`;

const Hash = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: ${COLORS.gray};
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 480px;
  font-family: monospace;
`;

class OrderObject extends React.Component {
  handleClick = () => {
    this.textarea.focus();
    this.textarea.select();
  };
  render() {
    return (
      <TextArea
        onClick={this.handleClick}
        innerRef={x => (this.textarea = x)}
        value={JSON.stringify(this.props.value, null, 4)}
        readOnly
      />
    );
  }
}

export default ({ orderHash, signedOrderObject }) => {
  if (!signedOrderObject) {
    return null;
  }
  return (
    <Fragment>
      <HashDiv>
        Order Hash: <Hash>{orderHash}</Hash>
      </HashDiv>
      <OrderObject value={signedOrderObject} />
    </Fragment>
  );
};
