import styled from "styled-components";
import Nav from "./Nav";
import Footer from "./Footer";
import { DIMENSIONS } from "./STYLE";

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

export default ({ children }) => (
  <Container>
    <Nav />
    <Content>
      <ContentContainer>{children}</ContentContainer>
    </Content>
    <Footer />
  </Container>
);
