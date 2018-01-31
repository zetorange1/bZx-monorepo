import styled from "styled-components";
import NavContent from "./NavContent";
import { DIMENSIONS, SHADOWS } from "../styles/constants";

const Container = styled.nav`
  background-color: #fafafa;
  height: ${DIMENSIONS.mobileNavHeight};
  margin-top: 32px;
  margin-bottom: 32px;

  /* center the inner container */
  display: flex;
  justify-content: center;

  /* make navbar fixed at the top on mobile */
  @media screen and (max-width: 600px) {
    background-color: white;
    margin-top: 0;
    position: fixed;
    top: 0;
    right: 0;
    left: 0;

    /* add a nice shadow effect */
    z-index: 1;
    box-shadow: ${SHADOWS.nav};
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

const Alert = styled.div`
  color: white;
  background: red;
  padding: 12px;
  box-shadow: ${SHADOWS.light};
`;

const Nav = () => (
  <div>
    <Alert>
      Warning: this portal is still under <em>heavy</em> development.
    </Alert>
    <Container>
      <Content>
        <NavContent />
      </Content>
    </Container>
  </div>
);

export default Nav;
