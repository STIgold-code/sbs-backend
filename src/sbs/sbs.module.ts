import { Module } from '@nestjs/common';
import { SbsController } from './sbs.controller';
import { SbsService } from './sbs.service';
import { SbsScraperService } from './scraper/sbs-scraper.service';

@Module({
  controllers: [SbsController],
  providers: [SbsService, SbsScraperService],
  exports: [SbsService],
})
export class SbsModule {}
