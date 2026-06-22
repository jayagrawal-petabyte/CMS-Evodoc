import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { DrugEntry } from '@cms/shared'

export interface PrescriptionPdfOptions {
  clinicName: string
  logoUrl?: string
  doctorName: string
  doctorQualification?: string
  patientName: string
  patientAge?: number
  date: string
  diagnosis: string
  drugs: DrugEntry[]
  notes?: string
}

export async function generatePrescriptionPdf(opts: PrescriptionPdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let y = height - 50

  // Header
  page.drawText(opts.clinicName, {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.39, 0.40, 0.95),
  })
  y -= 25

  page.drawText(`Dr. ${opts.doctorName}${opts.doctorQualification ? ` — ${opts.doctorQualification}` : ''}`, {
    x: 50,
    y,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 15

  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 20

  // Patient info
  page.drawText(`Patient: ${opts.patientName}`, { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(`Date: ${opts.date}`, { x: width - 200, y, size: 11, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
  y -= 20

  if (opts.patientAge) {
    page.drawText(`Age: ${opts.patientAge} years`, { x: 50, y, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
    y -= 20
  }

  y -= 10
  page.drawText('Diagnosis:', { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  y -= 16
  page.drawText(opts.diagnosis, { x: 50, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2), maxWidth: width - 100 })
  y -= 25

  // Drugs
  page.drawText('Medications:', { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  y -= 15

  // Table header
  const colX = [50, 200, 290, 360, 430]
  const headers = ['Drug Name', 'Dose', 'Frequency', 'Duration', 'Instructions']
  headers.forEach((h, i) => {
    page.drawText(h, { x: colX[i], y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) })
  })
  y -= 5
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 14

  opts.drugs.forEach((drug, index) => {
    if (y < 150) return
    const bg = index % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1)
    page.drawRectangle({ x: 50, y: y - 2, width: width - 100, height: 16, color: bg })
    const row = [drug.name, drug.dose, drug.frequency, drug.duration, drug.instructions]
    row.forEach((val, i) => {
      page.drawText(val || '-', {
        x: colX[i],
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: colX[i + 1] ? colX[i + 1] - colX[i] - 5 : 120,
      })
    })
    y -= 18
  })

  y -= 10

  if (opts.notes) {
    page.drawText('Advice / Notes:', { x: 50, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
    y -= 16
    page.drawText(opts.notes, { x: 50, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2), maxWidth: width - 100 })
    y -= 30
  }

  // Signature
  y = 100
  page.drawLine({ start: { x: width - 200, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(`Dr. ${opts.doctorName}`, { x: width - 200, y: y - 15, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(new Date().toISOString(), { x: 50, y: 50, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
