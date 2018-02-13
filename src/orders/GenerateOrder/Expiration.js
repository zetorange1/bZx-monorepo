import styled from "styled-components";
import { InputLabel } from "material-ui/Input";
import { IconButton, InputAdornment } from "material-ui";
import Icon from "material-ui/Icon";
import { DateTimePicker } from "material-ui-pickers";
import Section, { SectionLabel } from "../../common/FormSection";

const PickerContainer = styled.div`
  width: 240px;
`;

export default ({ expirationDate, setExpirationDate }) => (
  <Section>
    <SectionLabel>Expiration Date and Time</SectionLabel>
    <InputLabel>Expiration Date</InputLabel>
    <PickerContainer>
      <DateTimePicker
        fullWidth
        disablePast
        value={expirationDate}
        onChange={setExpirationDate}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton>
                <Icon>event</Icon>
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    </PickerContainer>
  </Section>
);
