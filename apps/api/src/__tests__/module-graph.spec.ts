import { AttendanceModule } from '../modules/attendance/attendance.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BattleSessionsModule } from '../modules/battle-sessions/battle-sessions.module';
import { CharactersModule } from '../modules/characters/characters.module';
import { DiscordBotModule } from '../modules/discord-bot/discord-bot.module';
import { HealthModule } from '../modules/health/health.module';
import { TeamBuilderModule } from '../modules/team-builder/team-builder.module';

/**
 * Every module `AppModule` wires, listed here rather than walked from `AppModule` itself:
 * importing that file runs `ConfigModule.forRoot`, which validates the environment and would make
 * this spec fail for a reason that has nothing to do with the module graph.
 */
const MODULES = [
  AuthModule,
  BattleSessionsModule,
  CharactersModule,
  AttendanceModule,
  TeamBuilderModule,
  DiscordBotModule,
  HealthModule,
];

/** A module as this spec handles it: only its identity and its name matter. */
type ModuleClass = new () => unknown;

/**
 * The module class behind one entry of an `imports` array.
 *
 * An entry is either the class itself or a dynamic module wrapping one under `module`.
 *
 * @param entry - One element of an `imports` array
 * @returns The class, or null when the entry is neither (a `forwardRef` thunk, say)
 */
function moduleClassOf(entry: unknown): ModuleClass | null {
  if (typeof entry === 'function') return entry as ModuleClass;

  const inner = (entry as { module?: unknown } | null)?.module;

  return typeof inner === 'function' ? (inner as ModuleClass) : null;
}

/**
 * Modules one module imports, read off the `@Module()` decorator.
 * @param moduleClass - The module to read
 * @returns Its imported module classes
 */
function importsOf(moduleClass: ModuleClass): ModuleClass[] {
  const entries =
    (Reflect.getMetadata('imports', moduleClass) as unknown[] | undefined) ??
    [];

  return entries
    .map(moduleClassOf)
    .filter((entry): entry is ModuleClass => entry !== null);
}

/**
 * The first import cycle reachable from a module, as a readable path.
 *
 * Depth-first, carrying the path taken: a module already on the current path is a cycle, while one
 * merely seen before on another branch is not.
 *
 * @param start - Module to start walking from
 * @returns The cycle as `A → B → A`, or null when there is none
 */
function findCycle(start: ModuleClass): string | null {
  const walk = (current: ModuleClass, path: ModuleClass[]): string | null => {
    if (path.includes(current)) {
      const names = [...path.slice(path.indexOf(current)), current].map(
        (entry) => entry.name,
      );

      return names.join(' → ');
    }

    for (const imported of importsOf(current)) {
      const cycle = walk(imported, [...path, current]);
      if (cycle) return cycle;
    }

    return null;
  };

  return walk(start, []);
}

// Một vòng lặp module làm Nest chết ngay lúc boot, mà cả jest lẫn `nest build` đều không thấy: test
// không dựng DI container, còn build chỉ biên dịch. Đây là lưới duy nhất bắt được nó trước khi deploy.
describe('Đồ thị module', () => {
  it.each(MODULES.map((moduleClass) => [moduleClass.name, moduleClass]))(
    '%s không nằm trong vòng lặp import nào',
    (_name, moduleClass) => {
      expect(findCycle(moduleClass as ModuleClass)).toBeNull();
    },
  );
});
