"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";

export default function InvoicePdfPreview({ url, invoiceNo, onClose, onDownload, busy }) {
  const [document, setDocument] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);
  const [pageText, setPageText] = useState("");
  const [containerWidth, setContainerWidth] = useState(760);
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let cancelled = false, loading;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        if (cancelled) return;
        loading = pdfjs.getDocument({ url });
        const pdf = await loading.promise;
        if (!cancelled) setDocument(pdf);
      } catch (reason) {
        console.error("Invoice preview failed:", reason);
        if (!cancelled) setError("The preview could not be loaded. The invoice is available to download.");
      }
    }
    load();
    return () => { cancelled = true; loading?.destroy(); };
  }, [url]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setContainerWidth(Math.max(100, entry.contentRect.width - 24)));
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!document) return undefined;
    let cancelled = false, rendering;
    setRendered(false);
    async function render() {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: Math.min(containerWidth / page.getViewport({ scale: 1 }).width, 1.5) });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        rendering = page.render({ canvasContext: canvas.getContext("2d"), viewport, transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0] });
        await rendering.promise;
        if (cancelled) return;
        setRendered(true);
        const content = await page.getTextContent();
        if (!cancelled) setPageText(content.items.map((item) => item.str).join(" "));
      } catch (reason) {
        if (!cancelled && reason.name !== "RenderingCancelledException") setError("The preview could not be rendered. The invoice is available to download.");
      }
    }
    render();
    return () => { cancelled = true; rendering?.cancel(); };
  }, [document, pageNumber, containerWidth]);

  useEffect(() => {
    const previousFocus = window.document.activeElement;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeRef.current.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = [...dialogRef.current.querySelectorAll("button:not(:disabled), a[href]")];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.document.addEventListener("keydown", keydown);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.document.removeEventListener("keydown", keydown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="invoice-preview-overlay" onClick={onClose}>
      <div className="invoice-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-preview-title" ref={dialogRef} onClick={(event) => event.stopPropagation()}>
        <header><h3 id="invoice-preview-title">Invoice {invoiceNo}</h3>
          <button title="Close preview" aria-label="Close preview" onClick={onClose} ref={closeRef}><X size={20} /></button>
        </header>
        <div className="invoice-preview-toolbar">
          <div><button aria-label="Previous page" title="Previous page" disabled={!document || pageNumber === 1} onClick={() => setPageNumber((current) => current - 1)}><ChevronLeft size={18} /></button>
            <span>{pageNumber} / {document?.numPages || 1}</span>
            <button aria-label="Next page" title="Next page" disabled={!document || pageNumber === document.numPages} onClick={() => setPageNumber((current) => current + 1)}><ChevronRight size={18} /></button></div>
          <div><a href={url} target="_blank" rel="noreferrer" aria-label="Open PDF in new tab" title="Open PDF in new tab"><ExternalLink size={18} /></a>
            <button aria-label="Download preview invoice" title="Download invoice" disabled={busy} onClick={onDownload}><Download size={18} /></button></div>
        </div>
        <div className="invoice-preview-viewport" ref={viewportRef} aria-busy={!rendered && !error}>
          {!rendered && !error ? <p role="status">Loading invoice...</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          <canvas ref={canvasRef} aria-label={`Invoice ${invoiceNo}, page ${pageNumber}`} role="img" data-rendered={rendered} style={{ visibility: rendered ? "visible" : "hidden" }} />
          <p className="invoice-preview-text">{pageText}</p>
        </div>
      </div>
    </div>, window.document.body
  );
}
