import styled, { css } from "styled-components";
import { COLORS, SHADOWS } from "../styles/constants";

export const Card = styled.div`
  min-height: 600px;
  box-shadow: ${SHADOWS.card};
  display: flex;
  flex-direction: column;
  max-width: 100vw;

  /* create a new stacking context */
  position: relative;
  z-index: 0;

  @media screen and (min-width: 600px) {
    margin-bottom: 24px;
  }
`;

export const Header = styled.div`
  padding: 12px 12px 0 12px;
  background-color: ${COLORS.blue};
  color: ${COLORS.white};
  overflow: auto;
`;

export const HeaderTitle = styled.h2`
  font-weight: 300;
  letter-spacing: 8px;
  text-transform: uppercase;
  padding-left: 12px;
`;

export const TabGroup = styled.div`
  display: flex;
`;

export const Tab = styled.div`
  padding: 12px 16px 8px;
  background-color: ${COLORS.gray};
  cursor: pointer;
  user-select: none;

  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 2px;

  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    color: rgba(255, 255, 255, 0.5);
  }

  ${p =>
    p.active &&
    css`
      color: black;
      box-shadow: ${SHADOWS.dark};
      background-color: ${COLORS.white};
      cursor: unset;
      z-index: 1;

      &:hover {
        color: black;
      }
    `};
`;

export const Content = styled.div`
  padding: 28px;
  background-color: ${COLORS.white};
  z-index: 1;
  position: relative;
  flex: 1;

  @media screen and (max-width: 600px) {
    padding: 12px;
  }
`;

export const ContentContainer = styled.div`
  display: ${p => (p.show ? `block` : `none`)};
`;
