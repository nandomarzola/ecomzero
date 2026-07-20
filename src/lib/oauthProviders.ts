import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";

type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export function createOAuthProviders(oauth: {
  google: OAuthCredentials | null;
  facebook: OAuthCredentials | null;
}) {
  return [
    ...(oauth.google
      ? [
          Google({
            ...oauth.google,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(oauth.facebook ? [Facebook(oauth.facebook)] : []),
  ];
}
