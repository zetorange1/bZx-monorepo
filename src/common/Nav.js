import styled from "styled-components";
import NavContent from "./NavContent";
import { DIMENSIONS, SHADOWS } from "./STYLE";

const Container = styled.nav`
  background: white;
  height: ${DIMENSIONS.mobileNavHeight};
  margin-top: 32px;

  /* center the inner container */
  display: flex;
  justify-content: center;

  /* make navbar fixed at the top on mobile */
  @media screen and (max-width: 600px) {
    margin-top: 0;
    position: fixed;
    top: 0;
    right: 0;
    left: 0;

    /* add a nice shadow effect */
    z-index: 1;
    box-shadow: ${SHADOWS.dark};
  }
`;

const Content = styled.div`
  /* as wide as it can be, but not too wide */
  width: 100%;
  max-width: ${DIMENSIONS.maxWidth};
  padding-left: 12px;
  padding-right: 12px;

  /* layout children horizontally */
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Nav = () => (
  <Container>
    <Content>
      <NavContent />
    </Content>
  </Container>
);

export default Nav;
