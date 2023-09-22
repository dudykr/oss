/** @type import('jest').Config */
module.exports = {
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testTimeout: 90000,
};
