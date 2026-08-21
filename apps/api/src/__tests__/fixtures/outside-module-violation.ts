/**
 * Fixture cho `module-boundary.spec.ts` — **cố tình vi phạm** ranh giới module, từ ngoài
 * `modules/`.
 *
 * Cặp với `modules/attendance/__tests__/fixtures/module-boundary-violation.ts`: file kia đi từ một
 * module sang module bên cạnh, file này đi từ ngoài vào. Hai hướng dùng hai nhánh khác nhau trong
 * `boundaries/elements`, nên cả hai đều cần được khoá.
 */
import { CharactersService } from '../../modules/characters/characters.service';

export type ViolatingImport = CharactersService;
