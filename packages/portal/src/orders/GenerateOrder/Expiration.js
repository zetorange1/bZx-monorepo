import moment from "moment";

import styled from "styled-components";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import FormHelperText from "@material-ui/core/FormHelperText";
import Tooltip from "@material-ui/core/Tooltip";
import Icon from "@material-ui/core/Icon";
import MuiFormControl from "@material-ui/core/FormControl";

import MomentUtils from "material-ui-pickers/utils/moment-utils";
import MuiPickersUtilsProvider from "material-ui-pickers/utils/MuiPickersUtilsProvider";
import { DateTimePicker } from "material-ui-pickers";

import Section, { SectionLabel } from "../../common/FormSection";
import { toBigNumber } from "../../common/utils";

const FormControl = styled(MuiFormControl)`
  margin: 24px !important;
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

const ToolTipHint = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

export default ({
  setStateForInput,
  maxDuration,
  setMaxDuration,
  expirationDate
}) => (
  <Section>
    <SectionLabel>Order Expiration and Loan Duration</SectionLabel>
    <div style={{ textAlign: `center` }}>
      <FormControl>
        <InputLabel
          style={{
            position: `relative`,
            transform: `translate(0, 1.5px) scale(0.75)`,
            paddingBottom: `15px`
          }}
        >
          Order Expiration Date
        </InputLabel>
        <MuiPickersUtilsProvider utils={MomentUtils}>
          <DateTimePicker
            fullWidth
            disablePast
            value={expirationDate}
            onChange={setStateForInput(`expirationDate`)}
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
      </FormControl>
      <FormControl>
        <InputLabel style={{ position: `relative` }}>
          Maxmium Loan Duration
        </InputLabel>
        <Input
          value={toBigNumber(maxDuration)
            .div(86400)
            .toNumber()}
          type="number"
          onChange={setMaxDuration}
          endAdornment={<InputAdornment position="end"> days</InputAdornment>}
        />
        <FormHelperTextWithDetail component="div">
          <Tooltip
            id="tooltip-icon"
            title={
              <div style={{ maxWidth: `300px` }}>
                The maximum amount a time a loan can be opened. Loans can be
                closed early by the trader.
              </div>
            }
          >
            <ToolTipHint>More Info</ToolTipHint>
          </Tooltip>
          <RightJustified>
            <RightJustifiedText>
              {`${toBigNumber(maxDuration)
                .div(3600)
                .toFixed(2)} hours`}
            </RightJustifiedText>
          </RightJustified>
        </FormHelperTextWithDetail>
      </FormControl>
    </div>
  </Section>
);
