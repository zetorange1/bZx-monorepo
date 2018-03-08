import { map, pipe } from "ramda";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = () => {
  const data = {};
  return formatData(data);
};
