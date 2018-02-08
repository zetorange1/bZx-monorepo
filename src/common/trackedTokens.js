/* globals localStorage */

export const getTrackedTokens = () => {
  const res = localStorage.getItem(`trackedTokens`);
  const tokens = JSON.parse(res);
  return tokens && tokens.length > 0 ? tokens : [];
};

export const addTrackedToken = addr => {
  const existingTokens = getTrackedTokens();
  const alreadyExists = existingTokens.includes(addr);
  if (!alreadyExists) {
    const newTrackedTokens = [...existingTokens, addr];
    localStorage.setItem(`trackedTokens`, JSON.stringify(newTrackedTokens));
  }
};

export const removeTrackedToken = addr => {
  const existingTokens = getTrackedTokens();
  const newTrackedTokens = existingTokens.filter(x => x !== addr);
  localStorage.setItem(`trackedTokens`, JSON.stringify(newTrackedTokens));
};
