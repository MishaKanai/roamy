const ACCESS_TOKEN = "ACCESS_TOKEN";
const REFRESH_TOKEN = "REFRESH_TOKEN";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

abstract class TokenManager {
  static setTokens = (tokens: Tokens) => {
    localStorage.setItem(ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN, tokens.refreshToken);
  };

  static clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
  };

  static getTokens = ():
    | {
        present: true;
        accessToken: string;
        refreshToken: string;
      }
    | {
        present: false;
      } => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    const present = !!(accessToken && refreshToken);
    if (!present) {
      return {
        present,
      };
    }
    return {
      present,
      accessToken,
      refreshToken,
    };
  };
}

export default TokenManager;
