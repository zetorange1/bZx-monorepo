import styled from "styled-components";
import NavContent from "./NavContent";

const Container = styled.nav`
  background: white;
  height: 64px;

  /* center the inner container */
  display: flex;
  justify-content: center;

  /* make navbar fixed at the top on mobile */
  @media screen and (max-width: 600px) {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;

    /* add a nice shadow effect */
    z-index: 1;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
  }
`;

const Content = styled.div`
  /* as wide as it can be, but not too wide */
  width: 100%;
  max-width: 1200px;
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
