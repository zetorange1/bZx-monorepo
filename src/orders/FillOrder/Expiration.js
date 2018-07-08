import { Fragment } from "react";
import styled from "styled-components";
import moment from "moment";

const Container = styled.div`
  display: flex;
  width: 100%;
  text-align: center;
  padding: 24px 0;
  justify-content: center;
  align-items: center;
`;

const DataContainer = styled.div``;

const Title = styled.div`
  margin-bottom: 24px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  line-height: 1;
`;

export default ({ expirationUnixTimestampSec }) => {
  const expiryDate = moment(expirationUnixTimestampSec * 1000).utc();
  const expiryDateStr = expiryDate.format(`MMMM Do YYYY, h:mm a UTC`);
  return (
    <Fragment>
      <Container>
        <DataContainer>
          <Title>Expires</Title>
          <div>{`${expiryDateStr} (${expiryDate.fromNow()})`}</div>
        </DataContainer>
      </Container>
    </Fragment>
  );
};
