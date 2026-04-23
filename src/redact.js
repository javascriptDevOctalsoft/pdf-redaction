import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, rgb } from "pdf-lib";
import { shouldRedact } from "./utils.js";

const INPUT_FILE = "./input/Receiving_Form.pdf";
const OUTPUT_FILE = "./output/redacted.pdf";

const PATTERNS = ["Procedure", "Operation"];

async function redactPDF() {
	try {
		const pdfBuffer = fs.readFileSync(INPUT_FILE);
		const loadingTask = pdfjsLib.getDocument({
			data: new Uint8Array(pdfBuffer)
		});
		const pdf = await loadingTask.promise;
		const pdfDoc = await PDFDocument.load(pdfBuffer);
		console.log(`Total pages: ${pdf.numPages}`);

		for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
		  const page = await pdf.getPage(pageIndex);
		  const textContent = await page.getTextContent();

		  const pdfLibPage = pdfDoc.getPages()[pageIndex - 1];

		  console.log(`Processing page ${pageIndex}`);

			textContent.items.forEach((item) => {
				const text = item.str;
				const words = text.split(/\s+/);
				const transform = item.transform;
				const startX = transform[4];
				const startY = transform[5];
				const avgCharWidth = item.width / text.length;
				let currentX = startX;

				words.forEach((word) => {
					const wordWidth = word.length * avgCharWidth;
					if (shouldRedact(word, PATTERNS)) {
						console.log("word---->", word, "Page No:", (pageIndex-1), "x--->", currentX, "y---->", startY, "width---->", wordWidth, "height---->", item.height)
						pdfLibPage.drawRectangle({
							x: currentX,
							y: startY,
							width: wordWidth,
							height: item.height,
							color: rgb(0, 0, 0)
						});
						console.log("Redacted:", word);
					}
					currentX += wordWidth + avgCharWidth;
				});
			});
		}
		const pdfBytes = await pdfDoc.save();
		fs.writeFileSync(OUTPUT_FILE, pdfBytes);
		console.log("Redacted PDF saved to:", OUTPUT_FILE);
	} catch (error) {
		console.error("Error:", error);
	}
}

redactPDF();