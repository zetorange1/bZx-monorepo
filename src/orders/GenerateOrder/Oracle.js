import { FormControl } from "material-ui/Form";
import Select from "material-ui/Select";
import { InputLabel } from "material-ui/Input";
import { MenuItem } from "material-ui/Menu";
import Section, { SectionLabel } from "../../common/FormSection";

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
