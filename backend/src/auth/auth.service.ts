import {
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { USERS_REPOSITORY } from "../common/constants/injection-tokens";
import { IUsersRepository } from "../users/interfaces/users-repository.interface";
import { toBaseUserDto } from "../users/users.mapper";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authenticateOrCreate(dto.email, dto.password);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticateOrCreate(dto.email, dto.password);
  }

  private async authenticateOrCreate(
    email: string,
    password: string
  ): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      const createdUser = await this.usersRepository.create(email, passwordHash);

      return this.buildAuthResponse(
        createdUser.id,
        createdUser.email,
        createdUser.createdAt
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.buildAuthResponse(user.id, user.email, user.createdAt);
  }

  private async buildAuthResponse(
    userId: string,
    email: string,
    createdAt: Date
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: userId,
      email
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user: toBaseUserDto({
        id: userId,
        email,
        passwordHash: "",
        gender: null,
        age: null,
        environment: null,
        createdAt,
        updatedAt: createdAt
      }),
      tokens: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: this.configService.get<string>("auth.jwtExpiresIn", "7d")
      }
    };
  }
}
