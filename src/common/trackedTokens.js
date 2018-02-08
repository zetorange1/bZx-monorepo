/* globals localStorage */

export const getTrackedTokens = () => {
  const res = localStorage.getItem(`tracked_tokens`);
  return res && res.length > 0 ? res : [];
};

export const addTrackedToken = addr => {
  const existingTokens = getTrackedTokens();
  const alreadyExists = existingTokens.includes(addr);
  if (!alreadyExists) {
    localStorage.setItem(`tracked_tokens`, [...existingTokens, addr]);
  }
};

export const removeTrackedToken = addr => {
  const existingTokens = getTrackedTokens();
  const newTrackedTokens = existingTokens.filter(x => x !== addr);
  localStorage.setItem(`tracked_tokens`, newTrackedTokens);
};
