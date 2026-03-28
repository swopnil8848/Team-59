import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtUser } from "../common/interfaces/jwt-user.interface";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("auth.jwtSecret", "dev-secret-change-me")
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      sub: payload.sub,
      email: payload.email
    };
  }
}
