import moment from "moment";

import styled from "styled-components";
import { InputLabel } from "material-ui/Input";
import { IconButton, InputAdornment } from "material-ui";
import { FormHelperText } from "material-ui/Form";
import Tooltip from "material-ui/Tooltip";
import Icon from "material-ui/Icon";

import MomentUtils from "material-ui-pickers/utils/moment-utils";
import MuiPickersUtilsProvider from "material-ui-pickers/utils/MuiPickersUtilsProvider";
import { DateTimePicker } from "material-ui-pickers";

import Section, { SectionLabel } from "../../common/FormSection";

const ExpirationGroup = styled.div`
  width: 260px;
  margin: 24px;
  text-align: center;
`;

const FormHelperTextWithDetail = styled(FormHelperText)`
  display: flex;
  position: relative;
`;

const RightJustified = styled.div`
  font-size: 0.75rem;
  position: absolute;
  right: 0px;
  max-width: 190px;
  word-break: break-word;
  text-align: right;
`;

const RightJustifiedText = styled.span`
  font-weight: bold;
`;

const MoreInfo = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

export default ({ expirationDate, setExpirationDate }) => (
  <Section>
    <SectionLabel>Expiration Date and Time</SectionLabel>
    <ExpirationGroup>
      <InputLabel>Expiration Date</InputLabel>
      <MuiPickersUtilsProvider utils={MomentUtils}>
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
      </MuiPickersUtilsProvider>
      <FormHelperTextWithDetail component="div">
        <Tooltip
          title={
            <div style={{ maxWidth: `300px` }}>
              The time displayed is set to your local timezone.
            </div>
          }
        >
          <MoreInfo>More Info</MoreInfo>
        </Tooltip>
        <RightJustified>
          <RightJustifiedText>
            {`Expires ${moment(expirationDate).fromNow()}`}
          </RightJustifiedText>
        </RightJustified>
      </FormHelperTextWithDetail>
    </ExpirationGroup>
  </Section>
);
