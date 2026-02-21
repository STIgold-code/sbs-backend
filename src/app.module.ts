import { Module } from '@nestjs/common';
import { SbsModule } from './sbs/sbs.module';

@Module({
  imports: [SbsModule],
})
export class AppModule {}
