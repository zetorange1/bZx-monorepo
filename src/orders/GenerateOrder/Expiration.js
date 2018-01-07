import { InputLabel } from "material-ui/Input";
import { IconButton, InputAdornment } from "material-ui";
import { DateTimePicker } from "material-ui-pickers";
import Section, { SectionLabel } from "../../common/FormSection";

export default ({ expirationDate, setExpirationDate }) => (
  <Section>
    <SectionLabel>Expiration Date and Time</SectionLabel>

    {/* TODO - datapicker -> expirationUnixTimestampSec */}
    <InputLabel>Expiration Date</InputLabel>
    <DateTimePicker
      disablePast
      helperText="Required"
      value={expirationDate}
      onChange={setExpirationDate}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton>event</IconButton>
          </InputAdornment>
        )
      }}
    />
  </Section>
);
