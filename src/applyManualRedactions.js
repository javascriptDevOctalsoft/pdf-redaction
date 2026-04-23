import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, rgb } from "pdf-lib";

const INPUT_FILE = "./input/CP_16_24_ECRF_testing.pdf";
const OUTPUT_FILE = "./output/manual_redacted.pdf";

//const curDocID= $v('APP_PTNT_DOC_FILES_ID');
//console.log("curDocID---->", curDocID)
//export async function applyManualRedactions(redactions, ogUrl, docFileID) {

function getRectForPageRotation(pageWidth, pageHeight, r, pageRotation) {
  const rot = ((pageRotation || 0) % 360 + 360) % 360; // normalize
  let x, y, width, height;

  switch (rot) {
    case 90:
      // PDF coords when page is rotated 90° clockwise:
      // origin is still bottom-left of unrotated page, but content is rotated.
      x = r.y;
      y = pageWidth - r.x - r.width;
      width = r.height;
      height = r.width;
      break;
    case 180:
      x = pageWidth - r.x - r.width;
      y = pageHeight - r.y - r.height;
      width = r.width;
      height = r.height;
      break;
    case 270:
      x = pageHeight - r.y - r.height;
      y = r.x;
      width = r.height;
      height = r.width;
      break;
    case 0:
    default:
      // standard bottom-left origin
      x = r.x;
      y = r.y;
      width = r.width;
      height = r.height;
      break;
  }

  return { x, y, width, height };
}
export async function applyManualRedactions(redactions, docFileID, wsName) {
        let pdfDoc = null;
		let sendingBlobUrl= "", redactedUuploadFileUrl= "";
		if(wsName == "rsdv_zydus_dev"){
			sendingBlobUrl= "https://bkp2.octalsoft.com/apex/"+wsName+"/fileshare/sendingBlobID";
			redactedUuploadFileUrl= "https://bkp2.octalsoft.com/apex/"+wsName+"/fileReceive/getFile";
		}else{
			sendingBlobUrl= "https://ins6.octalsoft.com/apex/"+wsName+"/fileshare/sendingBlobID";
			redactedUuploadFileUrl= "https://ins6.octalsoft.com/apex/"+wsName+"/fileReceive/getFile";
		}
        try {
                const response = await fetch(
                        sendingBlobUrl,
                        {
                                method: "POST",
                                headers: {
                                        "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                        FILE_ID: docFileID
                                })
                        }
                );

                if (!response.ok) {
                        throw new Error("Failed to fetch PDF");
                }

                const arrayBuffer = await response.arrayBuffer();
                pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                /* redactions.forEach((r) => {
                        const page = pages[r.page - 1];
                        if (!page) return;
                        const { height } = page.getSize();
                        const correctedY = height - r.y - r.height;
                        page.drawRectangle({
                                x: r.x,
                                y: correctedY,
                                width: r.width,
                                height: r.height,
                                color: rgb(0, 0, 0)
                        });
                }); */
				redactions.forEach((r) => {
					const page = pages[r.page - 1];
					if (!page) return;
					const { width, height } = page.getSize();
					// page rotation from the PDF (if available)
					const pageRotation = page.getRotation ? page.getRotation().angle : 0;
					// Prefer the rotation that was active in the viewer when redaction was created
					const effectiveRotation = typeof r.rotation === "number" ? r.rotation : pageRotation;
					const rect = getRectForPageRotation(width, height, r, effectiveRotation);
					page.drawRectangle({
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
						color: rgb(0, 0, 0)
					});
				});

                const bytes = await pdfDoc.save();
                // 🔥 Upload instead of saving locally
                const uploadResponse = await fetch(
                        redactedUuploadFileUrl,
                        {
                                method: "POST",
                                headers: {
                                        "Content-Type": "application/pdf",
                                        "FILE_ID": docFileID
                                },
                                body: bytes
                        }
                );

                if (!uploadResponse.ok) {
                        throw new Error("Failed to upload redacted PDF");
                }

                console.log("PDF uploaded successfully");
                console.log(uploadResponse);
                //const result = await uploadResponse.json();
                return uploadResponse.status;
        } catch (err) {
                console.error("Error:", err);
        }
}
