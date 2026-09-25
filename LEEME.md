# PO Management OPKO — versión 0.1 de pruebas

Aplicación en español para subir Excel .xlsx y consultar sus hojas. Incluye HTML, CSS, JavaScript, un Worker y una base Cloudflare D1. No necesita un dominio propio.

## Qué permite

- Subir uno o varios Excel de una misma fuente: OC 2025, OC 2026, Master Capital, STATUS u Otro.
- Guardar los valores de cada hoja en D1 y consultarlos desde otro equipo con la misma clave.
- Ver hojas, buscar en todas las celdas de una hoja y recorrer páginas de 50 filas.
- Conservar cargas independientes con fecha, incluso si el nombre del archivo se repite.
- Eliminar una carga de prueba, previa confirmación.
- Acceso mediante una clave compartida. La clave sólo se conserva en memoria mientras la página permanece abierta.

## 1. Preparar el equipo

Instala Node.js LTS desde https://nodejs.org/ y crea o usa tu cuenta de Cloudflare. Abre PowerShell en esta carpeta, que contiene `package.json` y `wrangler.jsonc`:

```powershell
cd "C:\Users\Willzkott\Desktop\PO MANAGEMENT OPKO\po-management-beta"
npm.cmd install
npx.cmd wrangler login
```

Se abrirá el navegador para autorizar tu cuenta de Cloudflare. Estos pasos se ejecutan en tu PC; no hay que pegar el código HTML en el panel de Cloudflare.

## 2. Crear la base de pruebas

```powershell
npx.cmd wrangler d1 create po-management-beta
```

Cloudflare mostrará un `database_id`. Abre `wrangler.jsonc` con un editor y reemplaza solamente `00000000-0000-0000-0000-000000000000` por ese identificador. Conserva el binding `DB`. Si Wrangler ofrece modificar el archivo automáticamente, revisa que exista una sola entrada `d1_databases` con ese binding.

```powershell
npm.cmd run db:remote
```

Acepta la aplicación de la migración. Esto crea las tablas de la beta en la base recién creada.

## 3. Publicar y poner la clave

```powershell
npm.cmd run deploy
npx.cmd wrangler secret put APP_PASSWORD
```

El segundo comando solicita una clave: elige una larga y exclusiva para esta prueba. No es tu contraseña de Cloudflare. Hasta configurar ese secreto, la aplicación rechaza el acceso a los datos.

El despliegue mostrará una dirección similar a `https://po-management-beta.tu-subdominio.workers.dev`. Abre la dirección real que entregue Cloudflare. Ingresa la clave de la beta.

**No uses la carga de una carpeta HTML en Cloudflare Pages para este paquete.** La aplicación necesita el Worker y D1; los comandos anteriores publican el conjunto. Los Excel originales quedan fuera de `public` y no se publican con el código.

## 4. Probar con tus archivos

1. Selecciona la fuente `OC 2025`, elige `Ordenes de Compra 2025.xlsx` y pulsa **Subir y guardar**.
2. Espera el mensaje de carga finalizada. Elige una hoja y busca un número de PO.
3. Repite con OC 2026, Master Capital y STATUS, eligiendo su fuente correspondiente.
4. Recarga la página e ingresa nuevamente: los archivos deben seguir en la biblioteca.
5. Para cargar una actualización, sube otro Excel. En esta beta se conserva como otra versión; no sobrescribe cargas anteriores.

Las hojas ARAMA de los archivos proporcionados tienen rangos declarados de más de un millón de filas. El importador recorre celdas con valores y omite filas vacías; mantiene la numeración original para localizar el dato en Excel.

## Prueba local opcional

Crea un archivo `.dev.vars` en esta carpeta con una clave exclusiva de prueba:

```text
APP_PASSWORD=coloca-aqui-una-clave-local-larga
```

Luego ejecuta:

```powershell
npm.cmd run db:local
npm.cmd run dev
```

Abre `http://localhost:8787`. La base local está separada de la remota. No publiques `.dev.vars` ni la carpeta `.wrangler`.

## Actualizar el borrador

Modifica los archivos de `public` o `src` y ejecuta `npm.cmd run deploy`. Los datos de D1 se conservan. Nuevas migraciones, cuando existan, se aplican primero con `npm.cmd run db:remote`.

## Alcance y límites

- Versión de consulta, todavía sin edición de celdas, conciliación entre fuentes, PO maestra ni trazabilidad de hitos.
- Se guardan valores visibles de las celdas como texto, no el Excel original, sus imágenes, estilos, macros o fórmulas ejecutables. Conserva tus originales como respaldo. Las fórmulas muestran su resultado guardado; recalcula y guarda el Excel antes de subirlo si es necesario.
- Se muestran todas las hojas, incluidas las ocultas, y sus filas con valores. Los contadores son filas con contenido, incluyendo títulos y totales; no equivalen a cantidad de PO únicas.
- Límite: 10 MB por archivo, 40 hojas, 50.000 filas con contenido por hoja y 200 columnas. El importador informa límites adicionales de texto; no trunca archivos silenciosamente.
- Una carga interrumpida queda marcada como incompleta y no se puede consultar. Elimínala y vuelve a subirla. No se muestra una importación parcial como terminada.
- La clave es compartida; todavía no hay usuarios individuales, recuperación de contraseña ni permisos por persona. Pensado para una prueba privada de un grupo pequeño. Todos los que tengan la clave pueden consultar y eliminar cargas.
- Workers y D1 tienen cuotas según tu plan. Revisa el consumo en Cloudflare. Esta guía no activa automáticamente un plan de pago.

## Si algo falla

- `Configura APP_PASSWORD`: ejecuta `npx.cmd wrangler secret put APP_PASSWORD`.
- `no such table` en los registros: revisa el `database_id` y ejecuta `npm.cmd run db:remote`.
- Clave incorrecta: distingue la clave local de la remota; actualiza el secreto si la olvidaste.
- Un comando no existe: instala Node.js LTS y vuelve a abrir PowerShell.
- El archivo no abre: guarda una copia .xlsx sin contraseña desde Excel.
- La web estática abre pero la API falla: publica con `npm.cmd run deploy`, no con carga directa de Pages.

## Referencias

- Cloudflare Worker con archivos estáticos: https://developers.cloudflare.com/workers/static-assets/
- D1 y sus comandos: https://developers.cloudflare.com/d1/wrangler-commands/
- Secretos: https://developers.cloudflare.com/workers/configuration/secrets/
- SheetJS CE 0.20.3: https://docs.sheetjs.com/docs/getting-started/installation/standalone/

La biblioteca SheetJS se incluye en `public/vendor` para que no dependa de una CDN al utilizar la aplicación. Mantén sus avisos de licencia. Los archivos reales del usuario no se incluyen en el paquete distribuible.
