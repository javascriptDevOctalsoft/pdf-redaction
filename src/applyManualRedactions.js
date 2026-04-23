import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, rgb } from "pdf-lib";

const INPUT_FILE = "./input/CP_16_24_ECRF_testing.pdf";
const OUTPUT_FILE = "./output/manual_redacted.pdf";

//const curDocID= $v('APP_PTNT_DOC_FILES_ID');
//console.log("curDocID---->", curDocID)
//export async function applyManualRedactions(redactions, ogUrl, docFileID) {

export async function applyManualRedactions(redactions, docFileID, wsName) {
        let pdfDoc = null;
		let sendingBlobUrl= "", redactedUuploadFileUrl= "";
		if(wsName == "rsdv_zydus_test"){
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
                redactions.forEach((r) => {
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
