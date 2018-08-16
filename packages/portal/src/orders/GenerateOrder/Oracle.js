import styled from "styled-components";
import Tooltip from "material-ui/Tooltip";
import { FormControl, FormHelperText } from "material-ui/Form";
import Select from "material-ui/Select";
import { InputLabel } from "material-ui/Input";
import { MenuItem } from "material-ui/Menu";
import Section, { SectionLabel } from "../../common/FormSection";

const MoreInfo = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

const FormHelperTextWithDetail = styled(FormHelperText)`
  display: flex;
`;

const RightJustified = styled.div`
  font-size: 0.75rem;
  position: absolute;
  right: 0px;
  max-width: 190px;
  word-break: break-word;
  text-align: right;
`;

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  //display: inline-block;
  //font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
  color: rgba(0, 0, 0, 0.54);
`;

export default ({ oracleAddress, setOracleAddress, oracles, etherscanURL }) => (
  <Section>
    <SectionLabel>Oracle</SectionLabel>

    <div>
      <FormControl>
        <InputLabel>Oracle</InputLabel>
        <Select value={oracleAddress} onChange={setOracleAddress}>
          {oracles
            .slice(0)
            .reverse()
            .map(x => (
              <MenuItem key={x.address} value={x.address}>
                {x.name} ({x.address.slice(0, 10)}...)
              </MenuItem>
            ))}
        </Select>
        <FormHelperTextWithDetail component="div">
          <Tooltip
            title={
              <div style={{ maxWidth: `240px` }}>
                The oracle contract that will handle asset price discovery and
                liquidation of positions.
              </div>
            }
          >
            <MoreInfo>More Info</MoreInfo>
          </Tooltip>
          <RightJustified>
            <AddressLink href={`${etherscanURL}address/${oracleAddress}`}>
              Etherscan
            </AddressLink>
          </RightJustified>
        </FormHelperTextWithDetail>
      </FormControl>
    </div>
  </Section>
);
