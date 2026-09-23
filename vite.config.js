import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// Auditoría adversarial (2026-09-25, release candidate para Óscar): dos directorios ajenos al
// código fuente real contaminaban el conteo de `vitest run` (el comando "oficial", `npm test`,
// sin flags manuales) porque ninguno de los dos coincide con las exclusiones por defecto de
// Vitest (`**/.{idea,git,cache,output,temp}/**` exige que el propio directorio empiece con
// punto — cubre `.output`, nunca `algo/output` dentro de otro directorio con punto):
// - `.vercel/output/functions/**` — artefacto de `vercel build` (E8) que incluye copias
//   literales de `api/*.test.js` (Vercel empaqueta cualquier `.js` bajo `api/` como función,
//   sin distinguir pruebas). Ya en `.gitignore`, nunca parte del repositorio.
// - `.claude/worktrees/**` — un git worktree ajeno (rama `worktree-snoopy-finding-newt`,
//   último commit 2026-08-01, no relacionado con esta sesión) con su propia copia de `src/`
//   y, por tanto, sus propios `*.test.js` — un checkout paralelo, nunca parte del árbol de
//   trabajo real de esta rama. También en `.gitignore`.
// Sin estas dos entradas, el comando oficial sobrecontaba 4 archivos / ~30 pruebas que no
// pertenecen al código real de esta rama — nunca un defecto de la aplicación, solo del
// descubrimiento de archivos. `...configDefaults.exclude` preserva TODAS las exclusiones por
// defecto de Vitest (node_modules, dist, .git, etc.) — esto solo agrega estas dos, nunca las
// reemplaza.
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, '**/.vercel/**', '**/.claude/**'],
  },
})
