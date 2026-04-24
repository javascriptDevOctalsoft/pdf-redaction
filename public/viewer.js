import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
const urlParams = new URLSearchParams(window.location.search);
console.log('window.location--->', window.location.search,  urlParams.get('docFileID'))
const docUrl = urlParams.get('docUrl');
let wsName= urlParams.get('wsName');
let docStatus= urlParams.get('docStatus');
if(docStatus != 1){
        document.getElementById("redactToolBtn").style.pointerEvents = "none";
        document.getElementById("undoBtn").style.pointerEvents = "none";
        document.getElementById("sendRedactions").style.pointerEvents = "none";

        document.getElementById("redactToolBtn").style.backgroundColor = "transparent";
        document.getElementById("undoBtn").style.backgroundColor = "transparent";
        document.getElementById("sendRedactions").style.backgroundColor = "transparent";

        document.getElementById("redactToolBtn").style.color = "#515172";
        document.getElementById("undoBtn").style.color = "#515172";
        document.getElementById("sendRedactions").style.color = "#515172";
}
console.log("wsName--->", wsName);
let prevSelPage = urlParams.get('prevSelPage');
let zoomStatus = urlParams.get('zoomStatus');
let docFileID= '';
let activeTool = null;
let undoStack = [];
let pageRotations = {}; 
//let scale = 1.2; // default
let currentScale = 1.2;
let currentViewport = null;
const MIN_SCALE = 1.2;
const MAX_SCALE = 2.0;
if(docUrl != undefined){
        docFileID =urlParams.get('docFileID');
        if(docFileID == ''){
                var splitDocUrl= docUrl.split(':');
                docFileID= splitDocUrl[splitDocUrl.length - 1]
        }
        console.log(urlParams, docUrl);
        console.log("docFileID---->", docFileID);
}

//const url = "./input/CP_16_24_ECRF_testing.pdf";
let apiUrl= "";
if(wsName != "rsdv_zydus_dev" && wsName != "rsdv_zydus_test"){
        apiUrl= "https://ins6.octalsoft.com/apex/"+wsName+"/fileshare/sendingBlobID";
}else{
        apiUrl= "https://bkp2.octalsoft.com/apex/"+wsName+"/fileshare/sendingBlobID";
}
const url = apiUrl;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

let pdfDoc = null;
let redactions = [];
let isDrawing = false;
let startX = 0;
let startY = 0;
//let startX,startY;
let curPageNo= 1;
let renderTask = null;
let baseImage = null; // snapshot of rendered PDF

const canvas = document.getElementById("pdfCanvas");
//const ctx = canvas.getContext("2d");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

async function loadPdfFromAPI(fileId) {
        try {
                const response = await fetch(apiUrl, {
                        method: "POST",
                        headers: {
                                "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                                FILE_ID: fileId
                        })
                });

                if (!response.ok) {
                        throw new Error("Failed to fetch PDF");
                }

                const arrayBuffer = await response.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                pdfDoc = pdf;

                if (prevSelPage != "null") {
                                                console.log("inside if", prevSelPage);
                        curPageNo = parseInt(prevSelPage);
                } else {
                        curPageNo = 1;
                                                console.log("inside else", prevSelPage);
                }
                                console.log("prevSelPage", prevSelPage);
                renderPage(curPageNo);
                document.getElementById('srch').value = curPageNo;

                // handle zoom
                /* if (zoomStatus === "IN") {
                        const viewport = page.getViewport({ scale: 1.5 });
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                } else if (zoomStatus === "OUT") {
                        canvas.removeAttribute("style");
                } */

                console.log("PDF loaded from API");
        } catch (err) {
                console.error("Error loading PDF:", err);
        }
}

loadPdfFromAPI(docFileID);

/* pdfjsLib.getDocument(url).promise
        .then(function(pdf) {
                pdfDoc = pdf;
                if(prevSelPage != undefined && prevSelPage != '' && prevSelPage != null){
                        curPageNo= parseInt(prevSelPage);
                        renderPage(curPageNo);
                        document.getElementById('srch').value= curPageNo;
                }else{
                        renderPage(1);
                        document.getElementById('srch').value= 1;
                }
                if(zoomStatus == "IN"){
                        document.getElementById("pdfCanvas").style.width= "700px";
                        document.getElementById("pdfCanvas").style.height= "800px";
                }else if(zoomStatus == "OUT"){
                        document.getElementById("pdfCanvas").removeAttribute("style");
                }
                console.log(pdfDoc);
        })
        .catch(function(error) {
                console.error("Error loading PDF:", error);
        });
 */
function setPage(num){
        window.parent.postMessage(
                { type: "SET_PAGE_NO", value: num},
                "*"
        );
}

/* function setZoomStatus(){
        window.parent.postMessage(
                { type: "SET_ZOOM_STATUS", value: localStorage.getItem("zoomVal")},
                "*"
        );
} */

function setZoomStatus() {
    window.parent.postMessage(
        { type: "SET_ZOOM_STATUS", value: currentScale.toString() },
        "*"
    );
}

/* function renderPage(num) {
        pdfDoc.getPage(num).then(function(page) {
                const viewport = page.getViewport({ scale: 1 });
                // canvas.height = viewport.height;
                canvas.height = 600;
                canvas.width = viewport.width;
                const renderTask = page.render({
                        canvasContext: ctx,
                        viewport: viewport
                });
                setPage(num);
                renderTask.promise.then(() => {
                        drawRedactions(num);
                });
        });
} */

function renderPage(num) {
        pdfDoc.getPage(num).then(function(page) {
                /* currentScale= 1.2;
        if (zoomStatus === "IN") {
            currentScale = 1.4;
        } else if (zoomStatus === "OUT") {
            currentScale = 1.2;
        } */
		const rotation = pageRotations[num] || 0;
		console.log("rotation---->", rotation)
		const viewport = page.getViewport({
			scale: currentScale,
			rotation: rotation
		});
		currentViewport = viewport;
                //const viewport = page.getViewport({ scale: currentScale });

                //canvas.height = 600;
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // 🚨 cancel previous render
                if (renderTask) {
                                renderTask.cancel();
                }

                renderTask = page.render({
                                canvasContext: ctx,
                                viewport: viewport
                });

                setPage(num);
                document.getElementById('curPageNo').innerText= num;
                document.getElementById('totalPage').innerText= pdfDoc.numPages;
                renderTask.promise.then(() => {
                                drawRedactions(num);

                                // 📸 save snapshot AFTER render
                                baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }).catch(err => {
                                if (err.name !== "RenderingCancelledException") {
                                                console.error(err);
                                }
                });
        });
}

function getMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
        };
}

function undoLastRedaction() {
        console.log("undoStack before", undoStack);
        console.log("redactions before", undoStack);
    if (undoStack.length === 0) return;
    const last = undoStack.pop();
    redactions = redactions.filter(r => r !== last);
        console.log("undoStack after", undoStack);
        console.log("redactions after", redactions);
    if (baseImage) {
                ctx.putImageData(baseImage, 0, 0);
    }
    drawRedactions(curPageNo);
        renderPage(curPageNo);
    //baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function rotatePage(angle) {
	console.log("rotatePage--->", rotatePage, "angle--->", angle);
    const currentRotation = pageRotations[curPageNo] || 0;
    pageRotations[curPageNo] = (currentRotation + angle) % 360;

    renderPage(curPageNo);
}

document.getElementById("redactToolBtn").addEventListener("click", () => {
    activeTool = "redact";
    canvas.style.cursor = "crosshair";
        document.getElementById("redactToolBtn").classList.add("active");
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        activeTool = null;
        canvas.style.cursor = "default";
                document.getElementById("redactToolBtn").classList.remove("active");
    }
});

document.getElementById("rotateRight").addEventListener("click", () => {
    rotatePage(90);
});

// document.getElementById("rotateLeft").addEventListener("click", () => {
//     rotatePage(-90);
// });

document.getElementById("prevBtn").addEventListener("click", () => {
        if (curPageNo > 1) {
                curPageNo--;
                renderPage(curPageNo);
                document.getElementById("srch").value= curPageNo;
        }
});

document.getElementById("nextBtn").addEventListener("click", () => {
        if (curPageNo < pdfDoc.numPages) {
                curPageNo++;
                renderPage(curPageNo);
                document.getElementById("srch").value= curPageNo;
        }
});

document.getElementById("sendRedactions").addEventListener("click", () => {
        showConfirm((result) => {
                if (result) {
                  sendRedactions();
                }
        });
});

document.getElementById("srchBtn").addEventListener("click", () => {
        pageSearch();
});

document.getElementById("srch").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        var curElemVal= parseInt(e.target.value);
        get_total_page(curElemVal);
});

/* document.getElementsByClassName("sticky_plus")[0].addEventListener("click", () => {
        document.getElementById("pdfCanvas").style.width= "900px";
        document.getElementById("pdfCanvas").style.height= "800px";
        localStorage.setItem("zoomVal", "IN");
        setZoomStatus();
});

document.getElementsByClassName("sticky_minus")[0].addEventListener("click", () => {
        document.getElementById("pdfCanvas").removeAttribute("style");
        localStorage.setItem("zoomVal", "OUT");
        setZoomStatus();
}); */

document.getElementsByClassName("sticky_plus")[0].addEventListener("click", () => {
    if (currentScale < MAX_SCALE) {
        currentScale = Math.min(currentScale + 0.2, MAX_SCALE);
        applyZoom();
    }
});

document.getElementsByClassName("sticky_minus")[0].addEventListener("click", () => {
    if (currentScale > MIN_SCALE) {
        currentScale = Math.max(currentScale - 0.2, MIN_SCALE);
        applyZoom();
    } else {
        currentScale = MIN_SCALE;
        applyZoom();
    }
});

function applyZoom(){
    const container = canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    const baseScale = 1.2;
    const scaleMultiplier = currentScale / baseScale;
    canvas.style.width = (700 * scaleMultiplier) + "px";
    canvas.style.height = (800 * scaleMultiplier) + "px";
    localStorage.setItem("zoomVal", currentScale.toString());
    localStorage.setItem("currentScale", currentScale.toString());
    setZoomStatus();
    if (pdfDoc) {
        renderPage(curPageNo);
    }
}

document.getElementById("undoBtn").addEventListener("click", () => {
    undoLastRedaction();
});

canvas.addEventListener("mousedown", e=>{
        if (activeTool !== "redact") return;
        isDrawing = true;
        const pos = getMousePos(canvas, e);
        startX = pos.x;
        startY = pos.y;
});

canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing || activeTool !== "redact") return;
        const pos = getMousePos(canvas, e);
        const currentX = pos.x;
        const currentY = pos.y;
        const width = currentX - startX;
        const height = currentY - startY;
        // 🔥 Restore clean PDF (FAST, no re-render)
        if (baseImage) {
                        ctx.putImageData(baseImage, 0, 0);
        }
        // 🟦 Draw preview
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(startX, startY, width, height);
        ctx.strokeStyle = "red";
        ctx.strokeRect(startX, startY, width, height);
});


canvas.addEventListener("mouseup", e => {
    if (!isDrawing || activeTool !== "redact") return;

    isDrawing = false;

    const pos = getMousePos(canvas, e);

    const endX = pos.x;
    const endY = pos.y;

    // 🔥 Convert BOTH points to PDF space
    const [pdfStartX, pdfStartY] = currentViewport.convertToPdfPoint(startX, startY);
    const [pdfEndX, pdfEndY] = currentViewport.convertToPdfPoint(endX, endY);
	const pageRotation = pageRotations[curPageNo] || 0;
    const newRedaction = {
        page: curPageNo,
		rotation: pageRotation,
        x: Math.min(pdfStartX, pdfEndX),
        y: Math.min(pdfStartY, pdfEndY),
        width: Math.abs(pdfEndX - pdfStartX),
        height: Math.abs(pdfEndY - pdfStartY)
    };
	console.log("newRedaction--->", newRedaction)
    redactions.push(newRedaction);
    undoStack.push(newRedaction);

    // redraw
    if (baseImage) {
        ctx.putImageData(baseImage, 0, 0);
    }

    drawRedactions(curPageNo);
    baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
});

function showConfirm(callback){
        const modal = document.getElementById("confirmModal");
        modal.style.display = "flex";
        document.getElementById("confirmYes").onclick = () => {
                modal.style.display = "none";
                callback(true);
        };
        document.getElementById("confirmNo").onclick = () => {
                modal.style.display = "none";
                callback(false);
        };
}


/*function drawRedactions(pageNum) {
        const pageRedactions = redactions.filter(r => r.page === pageNum);
        ctx.fillStyle = "black";
        pageRedactions.forEach(r => {
                ctx.fillRect(
                        r.x * currentScale,
            r.y * currentScale,
            r.width * currentScale,
            r.height * currentScale
                );
        });
}*/
function drawRedactions(pageNum) {
    const pageRedactions = redactions.filter(r => r.page === pageNum);

    ctx.fillStyle = "black";

    pageRedactions.forEach(r => {

        // 🔥 Convert back to viewport (rotated + scaled)
        const [x1, y1] = currentViewport.convertToViewportPoint(r.x, r.y);
        const [x2, y2] = currentViewport.convertToViewportPoint(
            r.x + r.width,
            r.y + r.height
        );

        const drawX = Math.min(x1, x2);
        const drawY = Math.min(y1, y2);
        const drawW = Math.abs(x2 - x1);
        const drawH = Math.abs(y2 - y1);

        ctx.fillRect(drawX, drawY, drawW, drawH);
    });
}

// function sendRedactions(){
        // console.log('&APP_PTNT_DOC_FILES_ID.')
        // fetch("/redact",{
                // method:"POST",
                // headers:{
                  // "Content-Type":"application/json"
                // },
                // body:JSON.stringify({redactions})
        // })
// }

function sendRedactions(){
    // Construct the payload including your extracted values
    const payload = {
        redactions: redactions,
                docFileID: docFileID,
                wsName: wsName
    };
    fetch("/redact", {
                        method: "POST",
                        headers: {
                                        "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
        })
        .then(response => {
                response.blob();
                window.parent.postMessage({ type: "REDACTION_RESULT", value: "Redacted File Saved Successfully"}, "*");
                document.getElementById("redactToolBtn").classList.remove("active");

        })
        .then(blob => {
                        // const url = window.URL.createObjectURL(blob);
                        // const a = document.createElement("a");
                        window.parent.postMessage({ type: "REDACTION_RESULT", value: "Redacted File Saved Successfully"}, "*");
                        document.getElementById("redactToolBtn").classList.remove("active");
        });
        activeTool = null;
        canvas.style.cursor = "default";
}

function pageSearch(){
        curPageNo = parseInt(document.getElementById("srch").value);
        if(curPageNo<=pdfDoc.numPages && curPageNo>0 ){
                renderPage(curPageNo);
        }

}

function get_total_page(e) {
        var maxAttr = document.getElementById('srch').getAttribute('max');
        if(e>pdfDoc.numPages) {
                document.getElementById('srch').value = '';
        }
        if(maxAttr != pdfDoc.numPages) {
                document.getElementById('srch').setAttribute('max',pdfDoc.numPages);
        }
}


