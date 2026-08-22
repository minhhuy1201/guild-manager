import { Global, Module } from '@nestjs/common';

import { Clock, SystemClock } from './clock';

/**
 * Cung cấp Clock cho toàn app — thời gian là mối quan tâm xuyên suốt nên đánh dấu
 * @Global() để module nghiệp vụ không phải import lại ở mọi nơi.
 */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
