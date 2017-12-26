import styled from "styled-components";

export const Logo = styled.div`
  font-weight: 700;
`;

export const HorizontalNav = styled.div`
  display: flex;

  /* hide on mobile */
  @media screen and (max-width: 600px) {
    display: none;
  }
`;
