import styled from "styled-components";
import { COLORS, DIMENSIONS } from "../styles/constants";

const Container = styled.footer`
  height: 60px;
  padding-top: 12px;
  padding-bottom: 12px;

  /* colors */
  color: ${COLORS.white};
  background: ${COLORS.gray};

  /* make footer stick to the bottom */
  grid-row-start: 3;
  grid-row-end: 4;

  /* center the inner container */
  display: flex;
  justify-content: center;
`;

const Content = styled.div`
  /* as wide as it can be, but not too wide */
  width: 100%;
  max-width: ${DIMENSIONS.maxWidth};
  padding-left: 12px;
  padding-right: 12px;
`;

export default () => (
  <Container>
    <Content>Footer stuff here</Content>
  </Container>
);
