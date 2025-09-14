import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';

export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.OIDC_AUDIENCE,
      issuer: process.env.KC_ISSUER_URL,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri: process.env.KC_JWKS_URI!,
        cache: true,
        rateLimit: true,
      }),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // attach useful fields
    return {
      sub: payload.sub,
      email: payload.email,
      resource_access: payload.resource_access,
      realm_access: payload.realm_access,
    };
  }
}
