import { Body, Controller, Post } from "@nestjs/common";
import { createResponse } from "../common/utils/response.util";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    const auth = await this.authService.register(dto);
    return createResponse(auth, "User authenticated successfully");
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    const auth = await this.authService.login(dto);
    return createResponse(auth, "User authenticated successfully");
  }
}
