import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisClientType, createClient } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private isReady = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>("redis.host", "127.0.0.1");
    const port = this.configService.get<number>("redis.port", 6379);
    const password = this.configService.get<string>("redis.password");

    this.client = createClient({
      socket: {
        host,
        port
      },
      password: password || undefined
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis client error: ${error.message}`);
      this.isReady = false;
    });

    this.client.on("ready", () => {
      this.isReady = true;
    });

    this.client.on("end", () => {
      this.isReady = false;
    });

    try {
      await this.client.connect();
      this.isReady = true;
    } catch (error) {
      this.isReady = false;
      this.logger.warn(`Redis connection failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return client.get(key);
  }

  async set(
    key: string,
    value: string,
    options?: {
      nx?: boolean;
      exSeconds?: number;
    }
  ): Promise<boolean> {
    const client = this.getClient();
    const result = await client.set(key, value, {
      NX: options?.nx,
      EX: options?.exSeconds
    });

    return result === "OK";
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    return client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    return (await client.exists(key)) === 1;
  }

  private getClient(): RedisClientType {
    if (!this.client || !this.isReady) {
      throw new Error("Redis client is not connected");
    }

    return this.client;
  }
}
