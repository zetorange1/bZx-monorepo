import styled from "styled-components";
import MuiDivider from "@material-ui/core/Divider";
import { COLORS } from "../styles/constants";

const Section = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;
export default Section;

export const SectionLabel = styled.div`
  align-self: flex-start;
  color: ${COLORS.blue};
  margin-bottom: 24px;
  font-size: 24px;
  line-height: 1;
`;

export const Divider = styled(MuiDivider)`
  margin-top: 24px !important;
  margin-bottom: 24px !important;
`;
