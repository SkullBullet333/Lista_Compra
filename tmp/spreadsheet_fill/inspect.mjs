import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/Documentos HD/CF/Lista_Compra/Modelo_Lista/modelo-itens-cadastrados.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table,region",
  maxChars: 12000,
  tableMaxRows: 100,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

const sheetInfo = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log("SHEETS\n" + sheetInfo.ndjson);

await fs.mkdir("D:/Documentos HD/CF/Lista_Compra/tmp/spreadsheet_fill/previews", { recursive: true });
for (const sheet of workbook.worksheets.items) {
  const preview = await workbook.render({ sheetName: sheet.name, autoCrop: "all", scale: 1.5, format: "png" });
  const safeName = sheet.name.replace(/[^a-z0-9_-]+/gi, "_");
  await fs.writeFile(`D:/Documentos HD/CF/Lista_Compra/tmp/spreadsheet_fill/previews/${safeName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
