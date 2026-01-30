import { ConfigService } from '@nestjs/config';
import { KnexModuleOptions } from 'nestjs-knex';

export const getDBConnectionConfig = (
  configService: ConfigService,
): KnexModuleOptions => ({
  config: {
    client: 'pg',
    connection: {
      host: configService.get<string>('DB_HOST'),
      port: +configService.get<number>('DB_PORT'),
      database: configService.get<string>('DB_NAME'),
      user: configService.get<string>('DB_USER'),
      password: configService.get<string>('DB_PASS'),
    },
  },
});
