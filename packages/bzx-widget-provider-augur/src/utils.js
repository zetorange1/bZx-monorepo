export function parseUrlGetParams() {
  const prmstr = window.location.search.substr(1);
  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray(prmstr) {
  const params = {};
  const prmarr = prmstr.split("&");
  for (let i = 0; i < prmarr.length; i++) {
    const tmparr = prmarr[i].split("=");
    params[tmparr[0]] = tmparr[1];
  }
  return params;
}

export const zeroAddress = "0x0000000000000000000000000000000000000000";
