import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "D:/Documentos HD/CF/Lista_Compra/outputs/preenchimento_itens_20261021/modelo-itens-cadastrados-preenchido.xlsx";
const outputDir = "D:/Documentos HD/CF/Lista_Compra/outputs/modelo_listas_prontas_20261021";
const outputPath = `${outputDir}/modelo-listas-prontas.xlsx`;
const previewPath = `${outputDir}/modelo-listas-prontas.png`;

const sourceWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceSheet = sourceWorkbook.worksheets.getItem("Itens");
const sourceRows = sourceSheet.getRange("A2:D54").values;

if (sourceRows.length !== 53) throw new Error(`Esperados 53 itens; encontrados ${sourceRows.length}.`);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Modelos");
const headers = ["Lista", "descrição", "ícone", "Item", "Categoria", "quantidade", "fator", "valor"];
const rows = sourceRows.map(([name, value, category, factor]) => [
  "Lista de compras",
  "Itens cadastrados para compras",
  "🛒",
  String(name ?? ""),
  String(category ?? ""),
  1,
  String(factor ?? ""),
  Number(value ?? 0),
]);

sheet.getRange("A1:H54").values = [headers, ...rows];
sheet.tables.add("A1:H54", true, "ModelosTable");
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;

sheet.getRange("A1:H54").format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange("A1:H1").format = {
  fill: "#0F766E",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  rowHeight: 24,
};
sheet.getRange("A2:H54").format.verticalAlignment = "center";
sheet.getRange("C2:C54").format.horizontalAlignment = "center";
sheet.getRange("F2:H54").format.horizontalAlignment = "right";
sheet.getRange("F2:F54").format.numberFormat = "0";
sheet.getRange("H2:H54").format.numberFormat = "0.00";

sheet.getRange("A1:A54").format.columnWidth = 22;
sheet.getRange("B1:B54").format.columnWidth = 32;
sheet.getRange("C1:C54").format.columnWidth = 10;
sheet.getRange("D1:D54").format.columnWidth = 27;
sheet.getRange("E1:E54").format.columnWidth = 23;
sheet.getRange("F1:F54").format.columnWidth = 12;
sheet.getRange("G1:G54").format.columnWidth = 10;
sheet.getRange("H1:H54").format.columnWidth = 12;

workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  range: "Modelos!A1:H54",
  include: "values,formulas",
  tableMaxRows: 60,
  tableMaxCols: 8,
  maxChars: 22000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log("ERROR_SCAN\n" + errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "Modelos", range: "A1:H54", scale: 1.25, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const saved = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const savedValues = saved.worksheets.getItem("Modelos").getRange("A1:H54").values;
const savedHeaders = savedValues[0].map(value => String(value));
if (JSON.stringify(savedHeaders) !== JSON.stringify(headers)) throw new Error("Os cabeçalhos exportados não correspondem ao formato exigido.");
const invalidRows = savedValues.slice(1).filter(row => !row[0] || !row[3] || !row[4] || row[5] !== 1 || !row[6] || row[7] !== 0);
if (invalidRows.length) throw new Error(`A validação encontrou ${invalidRows.length} linhas inválidas.`);
console.log(`VALIDATED rows=${savedValues.length - 1} output=${outputPath}`);
