import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/Documentos HD/CF/Lista_Compra/Modelo_Lista/modelo-itens-cadastrados.xlsx";
const outputDir = "D:/Documentos HD/CF/Lista_Compra/outputs/preenchimento_itens_20261021";
const outputPath = `${outputDir}/modelo-itens-cadastrados-preenchido.xlsx`;
const previewPath = `${outputDir}/modelo-itens-cadastrados-preenchido.png`;

const assignments = [
  ["Arroz", 0, "Mercado", "pct"],
  ["Leite", 0, "Laticínios", "un"],
  ["barla", 0, "Outros", "un"],
  ["carne de porco", 0, "Acougue", "kg"],
  ["Cebola", 0, "Feira & Hortifrúti", "kg"],
  ["penso higiénico", 0, "Higiene & Limpeza", "pct"],
  ["adoçante", 0, "Mercado", "un"],
  ["areia para gato", 0, "Outros", "pct"],
  ["Azeitona", 0, "Mercado", "un"],
  ["batata palha", 0, "Mercado", "pct"],
  ["bucha", 0, "Higiene & Limpeza", "un"],
  ["Calabresa", 0, "Acougue", "kg"],
  ["Coala", 0, "Higiene & Limpeza", "un"],
  ["costela mindinha", 0, "Acougue", "kg"],
  ["desinfetante", 0, "Higiene & Limpeza", "un"],
  ["detergente", 0, "Higiene & Limpeza", "un"],
  ["Emulsificante", 0, "Mercado", "un"],
  ["Energético", 0, "Bebidas", "un"],
  ["escova", 0, "Higiene & Limpeza", "un"],
  ["Fermento em pó", 0, "Mercado", "pct"],
  ["filtros para café", 0, "Mercado", "pct"],
  ["Frango a passarinho", 0, "Acougue", "kg"],
  ["limpa vidros", 0, "Higiene & Limpeza", "un"],
  ["lixeira", 0, "Higiene & Limpeza", "un"],
  ["pano", 0, "Higiene & Limpeza", "un"],
  ["Parmesão ralado", 0, "Laticínios", "pct"],
  ["Pernil de porco", 0, "Acougue", "kg"],
  ["petiscos", 0, "Outros", "pct"],
  ["Queijo", 0, "Laticínios", "kg"],
  ["Rap10", 0, "Padaria", "pct"],
  ["Rodo", 0, "Higiene & Limpeza", "un"],
  ["sabão em barra", 0, "Higiene & Limpeza", "pct"],
  ["sabão líquido", 0, "Higiene & Limpeza", "un"],
  ["sapolio", 0, "Higiene & Limpeza", "un"],
  ["Sardinha", 0, "Mercado", "un"],
  ["Tekitos", 0, "Acougue", "pct"],
  ["Temperos", 0, "Mercado", "pct"],
  ["carne moída", 0, "Acougue", "kg"],
  ["carne suína", 0, "Acougue", "kg"],
  ["linguiça", 0, "Acougue", "kg"],
  ["peito de frango", 0, "Acougue", "kg"],
  ["abobrinha", 0, "Feira & Hortifrúti", "kg"],
  ["alho", 0, "Feira & Hortifrúti", "kg"],
  ["banana", 0, "Feira & Hortifrúti", "kg"],
  ["batatas", 0, "Feira & Hortifrúti", "kg"],
  ["beterraba", 0, "Feira & Hortifrúti", "kg"],
  ["cenoura", 0, "Feira & Hortifrúti", "kg"],
  ["maçã", 0, "Feira & Hortifrúti", "kg"],
  ["melancia", 0, "Feira & Hortifrúti", "un"],
  ["mexerica", 0, "Feira & Hortifrúti", "kg"],
  ["Tomate", 0, "Feira & Hortifrúti", "kg"],
  ["Uvas passas", 0, "Mercado", "pct"],
  ["vagem", 0, "Feira & Hortifrúti", "kg"],
];

const allowedCategories = new Set([
  "Feira & Hortifrúti",
  "Padaria",
  "Mercado",
  "Acougue",
  "Laticínios",
  "Higiene & Limpeza",
  "Bebidas",
  "Outros",
]);

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Itens");
const sourceNames = sheet.getRange("A2:A54").values.flat().map(value => String(value ?? ""));

if (sourceNames.length !== assignments.length) {
  throw new Error(`Quantidade inesperada de itens: ${sourceNames.length}; esperado: ${assignments.length}`);
}
for (let index = 0; index < assignments.length; index += 1) {
  if (sourceNames[index] !== assignments[index][0]) {
    throw new Error(`Item inesperado na linha ${index + 2}: ${sourceNames[index]}`);
  }
  if (!allowedCategories.has(assignments[index][2])) {
    throw new Error(`Categoria inválida na linha ${index + 2}: ${assignments[index][2]}`);
  }
}

sheet.getRange("B2:D54").values = assignments.map(([, value, category, factor]) => [value, category, factor]);
workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  range: "Itens!A1:D54",
  include: "values,formulas",
  tableMaxRows: 60,
  tableMaxCols: 4,
  maxChars: 14000,
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
const preview = await workbook.render({ sheetName: "Itens", range: "A1:D54", scale: 1.5, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const saved = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const savedSheet = saved.worksheets.getItem("Itens");
const savedValues = savedSheet.getRange("A1:D54").values;
const invalidRows = savedValues.slice(1).filter(row => row[1] !== 0 || !allowedCategories.has(String(row[2])) || !String(row[3] ?? "").trim());
if (invalidRows.length) throw new Error(`A validação encontrou ${invalidRows.length} linhas inválidas no arquivo exportado.`);
console.log(`VALIDATED rows=${savedValues.length - 1} output=${outputPath}`);
