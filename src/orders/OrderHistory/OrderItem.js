import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";

const CardContent = styled(MuiCardContent)`
  position: relative;
`;

const Card = styled(MuiCard)`
  width: 100%;
  margin-bottom: 24px;
`;

const Pre = styled.pre`
  overflow: auto;
  background: #ddd;
  padding: 12px;
`;

export default ({ order }) => (
  <Card>
    <CardContent>
      <Pre>{JSON.stringify(order, null, 4)}</Pre>
    </CardContent>
  </Card>
);
