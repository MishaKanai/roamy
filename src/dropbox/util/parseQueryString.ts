export default function parseQueryString(str: string) {
  const ret = Object.create(null);
  if (typeof str !== "string") {
    return ret;
  }

  str = str.trim().replace(/^(\?|#|&)/, "");

  if (!str) {
    return ret;
  }

  str.split("&").forEach((param) => {
    const parts = param.replace(/\+/g, " ").split("=");
    // Firefox (pre 40) decodes `%3D` to `=`
    // https://github.com/sindresorhus/query-string/pull/37
    let key = parts.shift() as string;
    let val: string | undefined | null =
      parts.length > 0 ? parts.join("=") : undefined;

    key = decodeURIComponent(key);

    // missing `=` should be `null`:
    // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    val = val === undefined ? null : decodeURIComponent(val);

    if (ret[key] === undefined) {
      ret[key] = val;
    } else if (Array.isArray(ret[key])) {
      ret[key].push(val);
    } else {
      ret[key] = [ret[key], val];
    }
  });

  return ret;
}

// Parses the url and gets the access token if it is in the urls hash
export function getCodeFromUrl() {
  return parseQueryString(window.location.search).code;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
export function hasRedirectedFromAuth() {
  return !!getCodeFromUrl();
}
