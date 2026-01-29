function isBrowserClosed(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Target page, context or browser has been closed") || message.includes("Target closed") || message.includes("Browser closed");
}
export {
  isBrowserClosed
};
//# sourceMappingURL=browser-utils.js.map
