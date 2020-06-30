import 'providers/polyfill.provider';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'utils/strategies';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from 'modules/shared/shared.module';
import { CurrencyModule } from 'modules/currency/currency.module';
import { LanguageModule } from 'modules/language/language.module';
import { UserModule } from 'modules/user/user.module';
import { AuthModule } from 'modules/auth/auth.module';
import { BillModule } from 'modules/bill/bill.module';
import { TransactionModule } from 'modules/transaction/transaction.module';
import { AppService } from 'modules/app/services';
import { contextMiddleware, RegisterPromotionMiddleware } from 'middlewares';
import { UserAuthSubscriber } from 'modules/user/subscribers';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CurrencyModule,
    BillModule,
    TransactionModule,
    LanguageModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        subscribers: [UserAuthSubscriber],
        migrationsRun: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('EMAIL_HOST'),
          port: +configService.get('EMAIL_PORT'),
          secure: false,
          auth: {
            user: configService.get('EMAIL_ADDRESS'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
          tls: {
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: '"Bank Application" <payment@bank.pietrzakadrian.com>',
        },
        template: {
          dir: process.cwd() + 'src/modules/transaction/templates/',
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
    consumer.apply(contextMiddleware).forRoutes('*');
    consumer.apply(RegisterPromotionMiddleware).forRoutes('/Auth/login');
  }
}