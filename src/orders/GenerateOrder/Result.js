import { Fragment } from "react";
import styled from "styled-components";

const Hash = styled.div`
  margin-top: 24px;
`;

export default ({ orderHash, signedOrderObject }) => {
  if (!signedOrderObject) {
    return null;
  }
  return (
    <Fragment>
      <Hash>Order Hash: {orderHash}</Hash>
      <pre>{JSON.stringify(signedOrderObject, null, 4)}</pre>
    </Fragment>
  );
};
