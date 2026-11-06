// GitHub Pages: le SPA con BrowserRouter hanno bisogno di 404.html = index.html
// per gestire il refresh su rotte profonde (es. /corsi/icm-masterclass).
import { copyFileSync, writeFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')
console.log('postbuild: 404.html + .nojekyll creati')
