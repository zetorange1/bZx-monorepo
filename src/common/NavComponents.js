import styled from "styled-components";
import { COLORS } from "../styles/constants";

export const ImgLogo = styled.img`
  height: 32px;
`;

export const Logo = styled.div`
  font-weight: 700;
`;

export const HorizontalNav = styled.div`
  display: flex;

  /* hide on mobile */
  @media screen and (max-width: 600px) {
    display: none;
  }

  & > a {
    margin-left: 24px;
  }

  & > a:first-child {
    margin-left: 0;
  }
`;

export const VerticalNav = styled.div`
  display: flex;
  flex-direction: column;
  padding: 72px 24px 24px;

  & > a {
    font-size: 24px;
    margin-bottom: 32px;
    letter-spacing: 6px;
  }
`;

export const NavLink = styled.a`
  color: ${COLORS.gray};
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 14px;

  &:hover,
  &:active,
  &:focus {
    color: ${COLORS.blue};
  }
`;
