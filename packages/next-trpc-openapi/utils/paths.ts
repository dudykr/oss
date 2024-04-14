export const normalizePath = (path: string) => {
  return `/${path.replace(/^\/|\/$/g, "")}`;
};

export const getPathParameters = (path: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Array.from(path.matchAll(/\{(.+?)\}/g)).map(([_, key]) => key!);
};

export const getPathRegExp = (path: string) => {
  const groupedExp = path.replace(
    /\{(.+?)\}/g,
    (_, key: string) => `(?<${key}>[^/]+)`
  );
  return new RegExp(`^${groupedExp}$`, "i");
};
