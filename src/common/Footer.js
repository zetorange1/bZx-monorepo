import styled from "styled-components";

const Container = styled.footer`
  height: 60px;
  padding-top: 12px;
  padding-bottom: 12px;

  /* colors */
  color: white;
  background: #2879ff;

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
  max-width: 1200px;
  padding-left: 12px;
  padding-right: 12px;
`;

export default () => (
  <Container>
    <Content>Footer stuff here</Content>
  </Container>
);
