import styled from "styled-components";
import { COLORS } from "./STYLE";

export const Logo = styled.div`
  font-weight: 700;
`;

export const HorizontalNav = styled.div`
  display: flex;

  /* hide on mobile */
  @media screen and (max-width: 600px) {
    display: none;
  }

  & > div {
    margin-left: 24px;
    cursor: pointer;

    &:hover,
    &:active,
    &:focus {
      color: ${COLORS.blue};
    }

    &:first-child {
      margin-left: 0;
    }
  }
`;
