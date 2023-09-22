import { expect } from "@jest/globals";
//@ts-ignore
import { toMatchImageSnapshot } from "jest-image-snapshot";
expect.extend({ toMatchImageSnapshot });

export interface MatchOptions {}

export interface CustomMatcherResult {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toMatchImageSnapshot(options?: MatchOptions): CustomMatcherResult;
    }
  }
}

declare module "@jest/expect" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R> {
    toMatchImageSnapshot(options?: MatchOptions): CustomMatcherResult;
  }
}

export {};
