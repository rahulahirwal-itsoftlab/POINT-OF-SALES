export type AuthCookieConfig = {
  httpOnly: true;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  path: string;
};
