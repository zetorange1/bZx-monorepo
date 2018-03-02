// import styled from "styled-components";
import { FormControl } from "material-ui/Form";
// import TextField from "material-ui/TextField";
import Select from "material-ui/Select";
import { InputLabel } from "material-ui/Input";
import { MenuItem } from "material-ui/Menu";
import Section, { SectionLabel } from "../../common/FormSection";

// const AddressTextField = styled(TextField)`
//   max-width: 480px !important;
// `;

export default ({
  oracleAddress,
  setOracleAddress,
  oracles = [
    {
      name: `b0xOracle`,
      address: `0x0000000000000000000000000000000000000000`
    },
    {
      name: `otherOracle`,
      address: `0x1111111111111111111111111111111111111111`
    }
  ]
}) => (
  <Section>
    <SectionLabel>Oracle</SectionLabel>

    <div>
      <FormControl>
        <InputLabel>Oracle</InputLabel>
        <Select value={oracleAddress} onChange={setOracleAddress}>
          {oracles.map(x => (
            <MenuItem key={x.address} value={x.address}>
              {x.name} ({x.address.slice(0, 10)}...)
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  </Section>
);
